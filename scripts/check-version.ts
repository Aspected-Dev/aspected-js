// This script validates the package version against the OpenAPI spec version
// and the version currently on `main`. It is intended to run in CI on pull
// requests / branches that are not `main` itself.
//
// Rules:
//   1. The major.minor of package.json must equal the major.minor of the
//      `version` field in openapi.json.
//   2. Compared to the version on `main`:
//        - If major or minor changed, the patch version must be reset to 0.
//        - If major and minor are unchanged, the patch version must have
//          strictly increased.
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "..");

interface SemVer {
    major: number;
    minor: number;
    patch: number;
}

function parseSemVer(raw: string, source: string): SemVer {
    const match = /^(\d+)\.(\d+)\.(\d+)/.exec(raw.trim());
    if (!match) {
        throw new Error(`Could not parse semantic version "${raw}" from ${source}`);
    }
    return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function readJson(file: string): any {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function fail(message: string): never {
    console.error(`\n\u274c ${message}\n`);
    process.exit(1);
}

function ok(message: string): void {
    console.log(`\u2705 ${message}`);
}

function main(): void {
    const packageJsonPath = path.join(root, "package.json");
    const openapiJsonPath = path.join(root, "openapi.json");

    const packageJson = readJson(packageJsonPath);
    const openapiJson = readJson(openapiJsonPath);

    const currentVersion = parseSemVer(packageJson.version, "package.json");
    const openapiVersion = parseSemVer(
        openapiJson.info?.version ?? "",
        "openapi.json#info.version",
    );

    console.log(
        `Current package.json version: ${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`,
    );
    console.log(
        `openapi.json version:         ${openapiVersion.major}.${openapiVersion.minor}.${openapiVersion.patch}`,
    );

    // 1. major.minor must match the OpenAPI spec version.
    if (
        currentVersion.major !== openapiVersion.major ||
        currentVersion.minor !== openapiVersion.minor
    ) {
        fail(
            `package.json major.minor (${currentVersion.major}.${currentVersion.minor}) must match ` +
                `openapi.json major.minor (${openapiVersion.major}.${openapiVersion.minor}).`,
        );
    }
    ok("package.json major.minor matches openapi.json major.minor.");

    // Determine whether we are already on main — if so, there is nothing to compare against.
    const currentRef =
        process.env.GITHUB_REF_NAME ??
        execSync("git rev-parse --abbrev-ref HEAD", { cwd: root }).toString().trim();

    if (currentRef === "main") {
        ok("Running on main — skipping comparison against main.");
        return;
    }

    // Fetch main so we can diff against it, then read package.json as it exists there.
    let mainPackageJsonRaw: string;
    try {
        execSync("git fetch --depth=1 origin main", { cwd: root, stdio: "pipe" });
        mainPackageJsonRaw = execSync("git show origin/main:package.json", {
            cwd: root,
            stdio: ["pipe", "pipe", "pipe"],
        }).toString();
    } catch (error) {
        fail(
            `Could not read package.json from origin/main. Make sure the workflow checks out with ` +
                `full history (fetch-depth: 0) and that a "main" branch exists.\n${(error as Error).message}`,
        );
    }

    const mainVersion = parseSemVer(
        JSON.parse(mainPackageJsonRaw!).version,
        "origin/main's package.json",
    );
    console.log(
        `main package.json version:  ${mainVersion.major}.${mainVersion.minor}.${mainVersion.patch}`,
    );

    const majorOrMinorChanged =
        currentVersion.major !== mainVersion.major || currentVersion.minor !== mainVersion.minor;

    if (majorOrMinorChanged) {
        // Major or minor bumped: patch must reset to 0.
        if (currentVersion.patch !== 0) {
            fail(
                `The major or minor version changed compared to main ` +
                    `(${mainVersion.major}.${mainVersion.minor}.${mainVersion.patch} -> ` +
                    `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}), ` +
                    `so the patch version must be reset to 0.`,
            );
        }
        ok("Major/minor version changed and patch version was correctly reset to 0.");

        // Also guard against a major/minor *decrease*.
        if (
            currentVersion.major < mainVersion.major ||
            (currentVersion.major === mainVersion.major && currentVersion.minor < mainVersion.minor)
        ) {
            fail(
                `The major.minor version (${currentVersion.major}.${currentVersion.minor}) must not be lower ` +
                    `than the version on main (${mainVersion.major}.${mainVersion.minor}).`,
            );
        }
    } else {
        // Major and minor unchanged: patch must strictly increase.
        if (currentVersion.patch <= mainVersion.patch) {
            fail(
                `The patch version must increase compared to main. main is at ` +
                    `${mainVersion.major}.${mainVersion.minor}.${mainVersion.patch}, current is ` +
                    `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}.`,
            );
        }
        ok(
            `Patch version correctly increased compared to main (${mainVersion.patch} -> ${currentVersion.patch}).`,
        );
    }
}

main();
