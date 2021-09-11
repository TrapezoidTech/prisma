import type { A } from 'ts-toolbelt'
import type { L } from 'ts-toolbelt'
import type { O } from 'ts-toolbelt'

export type LMapper<I, R> = (item: I, key: number) => R
export type OMapper<I, R> = (item: I, key: string) => R

type Map<A, R> = {
  [K in keyof A]: R
}

function mapList<L extends L.List, I, R>(
  object: L & L.List<I>,
  mapper: LMapper<I, R>,
): Map<L, R> {
  const mapped = new Array(object.length)

  for (let pos = 0; pos < object.length; ++pos) {
    mapped[pos] = mapper(object[pos], pos)
  }

  return mapped as any
}

function mapObject<O extends object, I, R>(
  object: O & O.Record<A.Key, I>,
  mapper: OMapper<I, R>,
): Map<O, R> {
  const mapped = {}

  const keys = Object.keys(object)
  for (let pos = 0; pos < keys.length; ++pos) {
    mapped[pos] = mapper(object[keys[pos]], keys[pos])
  }

  return mapped as any
}

/**
 * Map an object or a list to a new one.
 *
 * (more efficient than native map)
 * @param object to be mapped
 * @param mapper to map with
 * @returns
 */
const map: typeof mapList & typeof mapObject = ((object: any, mapper: any) => {
  return Array.isArray(object)
    ? mapList(object, mapper)
    : mapObject(object, mapper)
}) as any

export { map }
