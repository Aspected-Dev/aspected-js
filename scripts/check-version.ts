// This script validates the package version against the OpenAPI spec version
// It ensures that the major and minor versions match between package.json and openapi.json
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
}

main();
