import { describe, expect, it } from 'vitest'
import { parseMongoOperation } from '../src/main/db/adapters/mongodb'

describe('mongodb query parser', () => {
  it('parses find with filter and projection', () => {
    const parsed = parseMongoOperation('db.users.find({"active":true},{"email":1})')

    expect(parsed).toEqual({
      kind: 'find',
      collection: 'users',
      filter: { active: true },
      projection: { email: 1 }
    })
  })

  it('parses find with a limit chain', () => {
    const parsed = parseMongoOperation('db.users.find({"active":true}).limit(25)')

    expect(parsed).toEqual({
      kind: 'find',
      collection: 'users',
      filter: { active: true },
      projection: undefined,
      limit: 25
    })
  })

  it('parses aggregate pipeline', () => {
    const parsed = parseMongoOperation('db.orders.aggregate([{"$match":{"status":"open"}},{"$limit":5}])')

    expect(parsed.kind).toBe('aggregate')
    if (parsed.kind !== 'aggregate') return
    expect(parsed.collection).toBe('orders')
    expect(parsed.pipeline).toHaveLength(2)
  })

  it('rejects malformed JSON arguments', () => {
    expect(() => parseMongoOperation('db.users.find({active:true})')).toThrow('MongoDB query arguments must be valid JSON')
  })

  it('rejects write commands in read-only mode', () => {
    expect(() => parseMongoOperation('db.users.deleteMany({"active":false})')).toThrow(
      'MongoDB read-only mode: write/admin commands are not allowed'
    )
  })

  it('rejects unsupported syntax', () => {
    expect(() => parseMongoOperation('db.users.countDocuments({})')).toThrow('Unsupported MongoDB query.')
  })
})
