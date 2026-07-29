# Intents

A list of intents the agent can utilize to modify the Vault.

## 0. Utilization

For extraction purposes, each intention request should be wrapped in a code block with the name `intent`. Requests should use JSON to represent their data. An example Markdown response from an agentic model may look something like the following:
````markdown
```intent
{
    "intent": "archive_document",
    "link": "Templates/Daily",
    "wait": false
}
```
````

### Utilization rules
- Only valid `intent` types will be correctly formatted and presented to the user.
- If the model must wait for an intent to complete, `wait` must be `true` and no intention requests may follow in the agent's response.
- Intention requests may exist anywhere within the response.
- Intention requests must be approved by the user before they can proceed.

## Generic Document Intentions
Applies to all types of documents.

### 1. create_document
Allows the agent to create a new document.

| Field      | Type                  | Purpose                                              |
|------------|-----------------------|------------------------------------------------------|
| intent     | "create_document"     | The intent the agent would like to invoke.           |
| folder     | `string`              | The folder to place the new document inside.         |
| name       | `string`              | The name of the new document.                        |
| properties | `Record<string, any>` | A list of properties the page may have.              |
| wait       | `boolean`             | `true` if the agent must wait for intent completion. |


### 2. archive_document
Allows the agent to archive an existing document.
For safety and record purposes, the agent is not allowed to directly delete any files.

| Field      | Type                  | Purpose                                              |
|------------|-----------------------|------------------------------------------------------|
| intent     | "archive_document"    | The intent the agent would like to invoke.           |
| link       | `string`              | The link of the document to archive.                 |
| wait       | `boolean`             | `true` if the agent must wait for intent completion. |


### 3. move_document
Allows the agent to move an existing document.

| Field         | Type            | Purpose                                              |
|---------------|-----------------|------------------------------------------------------|
| intent        | "move_document" | The intent the agent would like to invoke.           |
| link          | `string`        | The link of the document to move.                    |
| new_directory | `string`        | The directory to move the document into.             |
| wait          | `boolean`       | `true` if the agent must wait for intent completion. |


### 4. rename_document
Allows the agent to rename an existing document.

| Field    | Type              | Purpose                                              |
|----------|-------------------|------------------------------------------------------|
| intent   | "rename_document" | The intent the agent would like to invoke.           |
| link     | `string`          | The link of the document to rename.                  |
| new_name | `string`          | The new name of the document.                        |
| wait     | `boolean`         | `true` if the agent must wait for intent completion. |


## Generic Content Modification Intentions
Applies to all types of content.

### 5. insert_section
Allows the agent to insert a section into a document.

#### Intent behavior:
- `insert_after` can only not be null if `insert_before` is `null`, and vice versa.
  - `insert_after` && `insert_before` != `true`
  - If both fields are present, the intent is void.
- `insert_after` is `null` when prepending to the top of the page.
- `insert_before` is `null` when appending to the bottom of the page.
- If both `insert_after` and `insert_before` are `null`, appending to the bottom is the default behavior.

| Field           | Type               | Purpose                                                          |
|-----------------|--------------------|------------------------------------------------------------------|
| intent          | "insert_section"   | The intent the agent would like to invoke.                       |
| link            | `string`           | The link of the document to move.                                |
| new_directory   | `string`           | The directory to move the document into.                         |
| insert_after    | `string` \| `null` | The ID of the anchor that should be before the inserted content. |
| insert_before   | `string` \| `null` | The ID of the anchor that should be after the inserted content.  |
| section_content | `string`           | The new content to add.                                          |
| wait            | `boolean`          | `true` if the agent must wait for intent completion.             |


### 6. replace_section
Allows the agent to replace a section in a document.
Due to the behavior, an empty string replace content is the same as deleting a section.

#### Intent behavior:
- Will replace all content between two anchors.
- If `anchor_before` is null, the intent substitutes the beginning of the page.
- If `anchor_after` is null, the intent substitutes the end of the page.
- If both `anchor_before` and `anchor_after` are null, the intent is void.

| Field           | Type               | Purpose                                                          |
|-----------------|--------------------|------------------------------------------------------------------|
| intent          | "replace_section"  | The intent the agent would like to invoke.                       |
| link            | `string`           | The link of the document to move.                                |
| anchor_before   | `string` \| `null` | The ID of the anchor that should be before the replaced content. |
| anchor_after    | `string` \| `null` | The ID of the anchor that should be after the replaced content.  |
| section_content | `string`           | The content to replace with.                                     |
| wait            | `boolean`          | `true` if the agent must wait for intent completion.             |


## General Metadata Intentions
Applies to all types of metadata.

### 7. update_frontmatter
Allows the agent to update the frontmatter of a document.

#### Intent behavior:
- Will combine any previous properties with the provided properties, such that all previous properties exist and new values override old values.

| Field              | Type                  | Purpose                                              |
|--------------------|-----------------------|------------------------------------------------------|
| intent             | "update_frontmatter"  | The intent the agent would like to invoke.           |
| link               | `string`              | The link of the document to move.                    |
| updated_properties | `Record<string, any>` | Any updated properties.                              |
| wait               | `boolean`             | `true` if the agent must wait for intent completion. |
