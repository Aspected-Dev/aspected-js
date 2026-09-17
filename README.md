# @aspected/client

Node.js client for [Aspected](https://docs.aspected.com), a new kind of vector database that uses metadata as in-search
signals, not filters.

## Try Aspected locally

You can spin up a local instance of Aspected using Docker:

```bash
docker run -p 8080:8080 xillio/aspected:latest
```

This starts the Aspected server on `http://localhost:8080`, which you can point this client at. See the
[documentation](https://docs.aspected.com) for more information on getting started with the database setup.

## Installation

```bash
npm install @aspected/client
```

## Quick Start

```typescript
import { AspectedClient, AspectedError } from "@aspected/client";

const client = new AspectedClient("http://localhost:8080", {
    headers: { Authorization: "Bearer your-api-key" },
});
```

## Usage

`@aspected/client` is a thin, fetch-based wrapper around the Aspected HTTP API
([API reference](https://api.aspected.com)). Every method on `AspectedClient` corresponds with an HTTP endpoint of the
API. The client builds the request URL and query string, serializes the request body to JSON, sends the request (merging
in any default `RequestInit` options you provided, such as headers), and parses the JSON response into typed data. If
the server responds with a non-2xx status, the client throws an `AspectedError` instead of returning the response.

### Indexes

```typescript
// List all indexes
const { data } = await client.listIndexes();

// Create an index
await client.createIndex("my-index", {
    idSize: 36,
    schema: [
        {
            name: "color",
            type: "enum",
            path: "$.color",
            settings: { values: ["red", "green", "blue"] },
            multiplier: 1.0,
        },
        {
            name: "size",
            type: "enum",
            path: "$.size",
            settings: { values: ["small", "medium", "large"] },
            multiplier: 1.0,
        },
    ],
    hnsw: { M: 16, efConstruction: 200 },
});

// Get index details
const index = await client.getIndex("my-index");

// Search an index
const results = await client.searchIndex("my-index", {
    k: 10,
    query: { color: "red" },
});

// Delete an index
await client.deleteIndex("my-index");
```

### Documents

```typescript
// Upload documents
await client.uploadDocs("my-index", {
    data: [
        { id: "doc-1", doc: { color: "red", size: "small" } },
        { id: "doc-2", doc: { color: "blue", size: "large" } },
    ],
});

// Get a single document
const doc = await client.getDoc("my-index", "doc-1");

// List documents
const docs = await client.getDocs("my-index");
```

### Raw vector queries

If you have pre-computed vectors you can pass them directly using the `$raw` syntax:

```typescript
const results = await client.searchIndex("my-index", {
    k: 5,
    query: { color: { $raw: [0.1, 0.9, 0.3] } },
});
```

## Error Handling

HTTP errors are automatically parsed and thrown as `AspectedError` with the server's error message:

```typescript
import { AspectedError } from "@aspected/client";

try {
    await client.getIndex("nonexistent");
} catch (err) {
    if (err instanceof AspectedError) {
        console.error(err.message); // Formatted message, e.g. "404 Not Found: ..."
        console.error(err.status); // HTTP status code (e.g. 404)
        console.error(err.statusText); // HTTP status text (e.g. "Not Found")
        console.error(err.error); // Server error string, if provided
    }
}
```

## Configuration

The client constructor accepts a base URL and an optional standard `RequestInit` object. The
`RequestInit` is merged into every underlying `fetch` call the client makes, so it's the place to set headers (e.g.
authentication), a custom `agent`/`dispatcher`, or any other native fetch option:

```typescript
const client = new AspectedClient(
    "http://localhost:8080", // API base URL
    {
        headers: {
            Authorization: "Bearer your-api-key", // Authentication header
            "X-Custom": "value", // Any additional headers
        },
    },
);
```

## Development

### Regenerate the SDK from the OpenAPI spec

```bash
npm run generate
```

### Build

```bash
npm run build
```

### Checks

The same checks run in CI (see `.github/workflows/ci.yml`):

```bash
npm run format:check   # Prettier formatting
npm run lint           # oxlint
npm run compile        # tsup + tsc type-check
npm run check-version  # package.json vs openapi.json vs main
```

## License

MIT
