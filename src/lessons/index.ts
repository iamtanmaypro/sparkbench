// Lesson catalog. JSON imports are resolved at build time by Vite, keeping
// lessons plain data files a teacher could edit without touching TypeScript.

import type { Lesson } from './schema'
import lesson1 from './lesson1.json'
import lesson2 from './lesson2.json'
import lesson3 from './lesson3.json'
import lesson4 from './lesson4.json'
import lesson5 from './lesson5.json'

export const lessons: Lesson[] = [lesson1, lesson2, lesson3, lesson4, lesson5] as Lesson[]

export const FREE_BUILD_LESSON_ID = lesson5.id

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id)
}

/** Progression order position; -1 when unknown. */
export function lessonIndex(id: string): number {
  return lessons.findIndex((l) => l.id === id)
}
