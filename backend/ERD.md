# CAST backend ERD

Open this file in **Visual Studio Code** (update to the latest version) and use **Markdown Preview** (`Ctrl+Shift+V` / `Cmd+Shift+V`). Do not use Cursor’s preview: VS Code natively renders Mermaid and ERD syntax.

**Cardinality:** `||` one · `o|` zero-or-one · `}|` one-or-more · `o{` zero-or-more

```mermaid
erDiagram
    users ||--o{ user_actions : performs
    users ||--o{ scroll_logs : logs
    users ||--o{ mouse_position_logs : logs
    users ||--o{ jupyter_logs : logs
    users ||--o{ scaffold_data : owns
    users ||--o{ group_data : owns
    users ||--o{ image_data : owns
    users ||--o{ task_progress : runs
    users ||--o| narrative_cache : has
    users ||--o{ password_reset_codes : resets
    users ||--o{ shared_sessions : hosts
    users |o--o{ shared_sessions : controls
    users ||--o{ session_participants : joins
    users ||--o{ research_questions : writes

    scaffold_data |o--o{ group_data : contains
    scaffold_data |o--o{ image_data : places
    group_data |o--o{ image_data : groups

    shared_sessions ||--o{ session_participants : has

    research_questions ||--o{ research_question_images : links
    image_data ||--o{ research_question_images : links
    research_questions ||--o{ research_question_groups : links
    group_data ||--o{ research_question_groups : links

    users {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar password
        varchar first_name
        varchar last_name
        bool is_instructor
        bool is_guest
        bool is_staff
        bool is_superuser
        bool is_active
        datetime last_login
        datetime date_joined
    }

    password_reset_codes {
        int id PK
        uuid user_id FK
        varchar code
        datetime created_at
    }

    user_actions {
        uuid id PK
        uuid user_id FK
        varchar action
        json state_info
        text element
        json request_headers
        datetime timestamp
    }

    scroll_logs {
        uuid log_id PK
        uuid user_id FK
        json scroll_batch
        json request_headers
        datetime timestamp
    }

    mouse_position_logs {
        uuid log_id PK
        uuid user_id FK
        json mouse_pos_batch
        json request_headers
        datetime timestamp
    }

    jupyter_logs {
        uuid id PK
        uuid user_id FK
        text cell_type
        text source
        json metadata
        json outputs
        int execution_count
        json request_headers
        datetime timestamp
    }

    scaffold_data {
        uuid id PK
        uuid user_id FK
        varchar name
        int number
        json valid_group_numbers
        text description
        float x
        float y
        datetime created_at
        datetime last_modified
    }

    group_data {
        uuid id PK
        uuid user_id FK
        uuid scaffold_id FK
        varchar name
        int number
        text description
        float x
        float y
        int scaffold_group_number
        datetime created_at
        datetime last_modified
    }

    image_data {
        uuid id PK
        uuid user_id FK
        uuid group_id FK
        uuid scaffold_id FK
        varchar filepath
        text short_desc
        text long_desc
        bool long_desc_generating
        text source
        bool in_storyboard
        float x
        float y
        int scaffold_group_number
        bool has_order
        int order_num
        int index
        datetime last_saved
        datetime created_at
    }

    research_questions {
        uuid id PK
        uuid user_id FK
        text question_text
        int sort_order
        datetime created_at
        datetime last_modified
    }

    research_question_images {
        int id PK
        uuid researchquestion_id FK
        uuid imagedata_id FK
    }

    research_question_groups {
        int id PK
        uuid researchquestion_id FK
        uuid groupdata_id FK
    }

    task_progress {
        int id PK
        uuid user_id FK
        varchar task_type
        varchar task_id
        int current_stage
        int total_stages
        varchar stage_name
        varchar substage
        text error
        datetime created_at
    }

    narrative_cache {
        int id PK
        uuid user_id FK
        varchar story_structure_id
        text narrative
        json item_order
        text theme
        json categories
        text sequence_justification
        json sequence_summary
        json rq_reasoning
    }

    shared_sessions {
        uuid id PK
        uuid host_id FK
        uuid controlled_by_id FK
        varchar share_token UK
        bool is_active
        int max_participants
        datetime created_at
    }

    session_participants {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        datetime joined_at
        datetime last_seen
    }

    feature_flags {
        int id PK
        bool annotate_with_ai
        bool select_with_ai
    }
```

## Notes

- Table names match Django `db_table`. `users` is the custom `AUTH_USER_MODEL` (`users.User`).
- Delete rules: most FKs to `users` are **CASCADE**. `group_data.scaffold_id`, `image_data.group_id`, `image_data.scaffold_id`, and `shared_sessions.controlled_by` are **SET NULL**.
- `session_participants` is unique on `(session, user)`.
- `research_question_images` and `research_question_groups` are Django auto M2M tables (`api_researchquestion_images` / `api_researchquestion_groups` in the database).
- `feature_flags` is a standalone singleton-style row with no relations.
- A few column names in the diagram are aliased so Mermaid will parse (`question_text` = `text`, `sort_order` / `item_order` = `order`).
- `User` also inherits Django auth M2M tables (`users_groups`, `users_user_permissions`); those are omitted here.
