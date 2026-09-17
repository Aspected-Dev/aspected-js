/**
 * Quickstart example for the Aspected Node.js client.
 *
 * This script demonstrates the full lifecycle of an Aspected index:
 * 1. Create an index with enum resolvers
 * 2. List all indexes
 * 3. Upload documents
 * 4. Perform sparse vector searches (single and multi-aspect)
 * 5. Delete the index
 *
 * Prerequisites:
 *   - A running Aspected server (default: http://localhost:8080)
 *     Start one with: docker run -p 8080:8080 xillio/aspected:latest
 *   - Install the SDK dependencies: npm install (from repo root)
 *
 * No model downloads are required — this example uses only enum resolvers.
 *
 * Docs: https://docs.aspected.com
 */

import { AspectedClient } from "../src";
import type { CreateIndexRequest, QuerySearch, UploadDocsRequest } from "../src";

const INDEX_NAME = "products";
const SERVER_URL = "http://localhost:8080";

async function main(): Promise<void> {
    const client = new AspectedClient(SERVER_URL);

    // --------------------------------------------------------------
    // 1. Create an index
    //
    // We define two enum aspects: "category" and "colour".
    // The enum resolver maps categorical values to radial
    // embeddings. The path uses JSONPath to extract values
    // from documents.
    // --------------------------------------------------------------
    console.log("Creating index...");
    const createBody: CreateIndexRequest = {
        idSize: 36,
        schema: [
            {
                name: "category",
                type: "enum",
                path: "$.category",
                settings: {
                    values: ["electronics", "clothing", "food", "furniture", "toys"],
                },
                multiplier: 1.0,
            },
            {
                name: "colour",
                type: "enum",
                path: "$.colour",
                settings: {
                    values: ["red", "green", "blue", "black", "white", "yellow"],
                },
                multiplier: 1.0,
            },
        ],
    };
    const createResp = await client.createIndex(INDEX_NAME, createBody);
    console.log(`  Created: ${createResp.data.created}`);

    // --------------------------------------------------------------
    // 2. List all indexes
    // --------------------------------------------------------------
    console.log("\nListing indexes...");
    const listResp = await client.listIndexes();
    console.log(`  Total indexes: ${listResp.total}`);
    for (const idx of listResp.data) {
        console.log(`    - ${idx.name}`);
    }

    // --------------------------------------------------------------
    // 3. Upload documents
    //
    // Each document has a category and colour. The enum
    // resolvers extract values via the JSONPath and convert
    // them to radial embeddings that are concatenated into a
    // single composite vector.
    // --------------------------------------------------------------
    console.log("\nUploading documents...");
    const uploadBody: UploadDocsRequest = {
        data: [
            { id: "prod-001", doc: { category: "electronics", colour: "black" } },
            { id: "prod-002", doc: { category: "electronics", colour: "white" } },
            { id: "prod-003", doc: { category: "clothing", colour: "red" } },
            { id: "prod-004", doc: { category: "clothing", colour: "blue" } },
            { id: "prod-005", doc: { category: "food", colour: "green" } },
            { id: "prod-006", doc: { category: "furniture", colour: "white" } },
            { id: "prod-007", doc: { category: "toys", colour: "red" } },
            { id: "prod-008", doc: { category: "toys", colour: "yellow" } },
            { id: "prod-009", doc: { category: "electronics", colour: "blue" } },
            { id: "prod-010", doc: { category: "furniture", colour: "black" } },
        ],
        policy: { missing: "Fail" },
    };
    const uploadResp = await client.uploadDocs(INDEX_NAME, uploadBody);
    console.log(`  Created: ${uploadResp.data.created}`);
    console.log(`  Updated: ${uploadResp.data.updated}`);

    // --------------------------------------------------------------
    // 4a. Search — single aspect (sparse query)
    //
    // Search for products in the "electronics" category.
    // Only the category aspect is specified; the colour
    // dimensions are left undefined (sparse). This is the
    // key feature of Aspects: you can query on any subset
    // of aspects.
    // --------------------------------------------------------------
    console.log("\nSearching for 'electronics' (single aspect)...");
    const singleQuery: QuerySearch = {
        k: 5,
        query: { category: "electronics" },
    };
    let searchResp = await client.searchIndex(INDEX_NAME, singleQuery);
    console.log(`  Results (${searchResp.data.length} hits):`);
    for (const hit of searchResp.data) {
        console.log(`    [${hit.distance.toFixed(4)}] ${hit.id}`);
    }

    // --------------------------------------------------------------
    // 4b. Search — multiple aspects
    //
    // Search for "red toys" — both aspects are specified so
    // results must be close on both dimensions.
    // --------------------------------------------------------------
    console.log("\nSearching for 'red toys' (both aspects)...");
    const multiQuery: QuerySearch = {
        k: 3,
        query: {
            category: "toys",
            colour: "red",
        },
    };
    searchResp = await client.searchIndex(INDEX_NAME, multiQuery);
    console.log(`  Results (${searchResp.data.length} hits):`);
    for (const hit of searchResp.data) {
        console.log(`    [${hit.distance.toFixed(4)}] ${hit.id}`);
    }

    // --------------------------------------------------------------
    // 5. Delete the index
    // --------------------------------------------------------------
    console.log("\nDeleting index...");
    const deleteResp = await client.deleteIndex(INDEX_NAME);
    console.log(`  Deleted: ${deleteResp.data.deleted}`);

    console.log("\nDone!");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
