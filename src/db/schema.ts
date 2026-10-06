import {
    toTypedRxJsonSchema,
    ExtractDocumentTypeFromTypedRxJsonSchema,
} from 'rxdb';

export const profileSchemaLiteral = {
    title: 'profile schema',
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string'
        },
        theme: {
            type: 'string'
        },
        _deleted: {
            type: 'boolean'
        },
        _modified: {
            type: 'number'
        },
        field_clocks: {
            type: 'object',
            additionalProperties: { type: 'string' }
        },
        user_id: { type: 'string' },
        updated_at: { type: 'string' },
        deleted_at: { type: ['string', 'null'] },
        version: { type: 'number' }
    },
    required: ['id', 'name', '_deleted', '_modified']
} as const;

export const categorySchemaLiteral = {
    title: 'category schema',
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        profile_id: {
            type: 'string',
        },
        name: {
            type: 'string'
        },
        icon: {
            type: 'string'
        },
        _deleted: {
            type: 'boolean'
        },
        _modified: {
            type: 'number'
        },
        field_clocks: {
            type: 'object',
            additionalProperties: { type: 'string' }
        },
        user_id: { type: 'string' },
        updated_at: { type: 'string' },
        deleted_at: { type: ['string', 'null'] },
        version: { type: 'number' }
    },
    required: ['id', 'profile_id', 'name', '_deleted', '_modified']
} as const;

export const transactionSchemaLiteral = {
    title: 'transaction schema',
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        profile_id: {
            type: 'string',
        },
        amount: {
            type: 'number'
        },
        type: {
            type: 'string',
            enum: ['expense', 'income']
        },
        category_id: {
            type: 'string'
        },
        timestamp: {
            type: 'number'
        },
        note: {
            type: 'string'
        },
        tag_ids: {
            type: 'array',
            items: {
                type: 'string'
            }
        },
        _deleted: {
            type: 'boolean'
        },
        _modified: {
            type: 'number'
        },
        field_clocks: {
            type: 'object',
            additionalProperties: { type: 'string' }
        },
        user_id: { type: 'string' },
        updated_at: { type: 'string' },
        deleted_at: { type: ['string', 'null'] },
        version: { type: 'number' }
    },
    required: ['id', 'profile_id', 'amount', 'type', 'timestamp', '_deleted', '_modified']
} as const;

export const profileSchemaTyped = toTypedRxJsonSchema(profileSchemaLiteral);
export type ProfileDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof profileSchemaTyped>;

export const categorySchemaTyped = toTypedRxJsonSchema(categorySchemaLiteral);
export type CategoryDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof categorySchemaTyped>;

export const debtSchemaLiteral = {
    title: 'debt schema',
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        profile_id: {
            type: 'string',
        },
        person_name: {
            type: 'string'
        },
        amount: {
            type: 'number'
        },
        type: {
            type: 'string',
            enum: ['owe', 'lent']
        },
        purpose: {
            type: 'string'
        },
        due_date: {
            type: 'number'
        },
        created_at: {
            type: 'number'
        },
        status: {
            type: 'string',
            enum: ['active', 'settled']
        },
        _deleted: {
            type: 'boolean'
        },
        _modified: {
            type: 'number'
        },
        field_clocks: { type: 'object', additionalProperties: { type: 'string' } },
        user_id: { type: 'string' }, updated_at: { type: 'string' }, deleted_at: { type: ['string', 'null'] }, version: { type: 'number' }
    },
    required: ['id', 'profile_id', 'person_name', 'amount', 'type', 'created_at', 'status', '_deleted', '_modified']
} as const;

export const transactionSchemaTyped = toTypedRxJsonSchema(transactionSchemaLiteral);
export type TransactionDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof transactionSchemaTyped>;

export const debtSchemaTyped = toTypedRxJsonSchema(debtSchemaLiteral);
export type DebtDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof debtSchemaTyped>;

export const debtPaymentSchemaLiteral = {
    title: 'debt payment schema', version: 0, primaryKey: 'id', type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 }, debt_id: { type: 'string' }, amount: { type: 'number' },
        paid_at: { type: 'number' }, note: { type: 'string' }, _deleted: { type: 'boolean' }, _modified: { type: 'number' },
        field_clocks: { type: 'object', additionalProperties: { type: 'string' } }, user_id: { type: 'string' },
        updated_at: { type: 'string' }, deleted_at: { type: ['string', 'null'] }, version: { type: 'number' },
    },
    required: ['id', 'debt_id', 'amount', 'paid_at', '_deleted', '_modified'],
} as const;
export const debtPaymentSchemaTyped = toTypedRxJsonSchema(debtPaymentSchemaLiteral);
export type DebtPaymentDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof debtPaymentSchemaTyped>;

export const syncConflictSchemaLiteral = {
    title: 'sync conflict ledger schema',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        doc_id: { type: 'string' },
        collection_name: { type: 'string' },
        field: { type: 'string' },
        local_value: { type: 'string' },
        remote_value: { type: 'string' },
        winner: { type: 'string', enum: ['local', 'remote'] },
        resolved_at: { type: 'string' },
        resolved_by: { type: 'string' },
        requires_prompt: { type: 'boolean' },
        _deleted: { type: 'boolean' },
        _modified: { type: 'number' },
    },
    required: ['id', 'doc_id', 'collection_name', 'field', 'winner', 'resolved_at', 'resolved_by', 'requires_prompt', '_deleted', '_modified'],
} as const;
export const syncConflictSchemaTyped = toTypedRxJsonSchema(syncConflictSchemaLiteral);
export type SyncConflictDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof syncConflictSchemaTyped>;
