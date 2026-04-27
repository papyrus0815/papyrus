/**
 * 가벼운 K-means clustering — 의존성 추가 회피.
 * 6축 능력치 갤럭시 view의 자동 군집화에 사용.
 *
 * 결정성: seed 기반의 deterministic 초기화 (Lloyd's algorithm).
 */

type Vec = number[]

function vecDistSq(a: Vec, b: Vec): number {
  let s = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!
    s += d * d
  }
  return s
}

function copyVec(v: Vec): Vec {
  return v.slice()
}

/** 결정적 의사 난수 (seed 기반) — 같은 입력에 항상 같은 결과 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface KMeansResult {
  /** 입력 순서대로의 cluster index (0..k-1) */
  assignments: number[]
  /** 각 cluster의 centroid vector */
  centroids: Vec[]
  /** 수렴까지 반복 횟수 */
  iterations: number
}

export interface KMeansOptions {
  iters?: number
  seed?: number
}

/**
 * @param vectors 입력 벡터들 (모두 같은 차원)
 * @param k 클러스터 수 (>= 1)
 * @param options iters: 최대 반복 (기본 30), seed: 초기화 결정성 (기본 1)
 */
export function kmeans(vectors: Vec[], k: number, options: KMeansOptions = {}): KMeansResult {
  const iters = options.iters ?? 30
  const seed = options.seed ?? 1
  const n = vectors.length
  if (n === 0 || k <= 0) {
    return { assignments: [], centroids: [], iterations: 0 }
  }
  const dim = vectors[0]!.length
  const rand = mulberry32(seed)

  // K-means++ 식 초기화 — 첫 점은 랜덤, 이후는 거리 비례 가중 샘플링
  const centroids: Vec[] = []
  centroids.push(copyVec(vectors[Math.floor(rand() * n)]!))
  for (let c = 1; c < k; c++) {
    const distances = vectors.map((v) => {
      let minD = Infinity
      for (const cent of centroids) {
        const d = vecDistSq(v, cent)
        if (d < minD) minD = d
      }
      return minD
    })
    const total = distances.reduce((s, x) => s + x, 0)
    if (total === 0) {
      // 모두 동일점 — 그냥 임의 인덱스
      centroids.push(copyVec(vectors[Math.floor(rand() * n)]!))
      continue
    }
    let r = rand() * total
    let pickedIdx = 0
    for (let i = 0; i < n; i++) {
      r -= distances[i]!
      if (r <= 0) {
        pickedIdx = i
        break
      }
    }
    centroids.push(copyVec(vectors[pickedIdx]!))
  }

  let assignments = new Array(n).fill(0)
  let iteration = 0
  for (; iteration < iters; iteration++) {
    // assign
    let changed = false
    for (let i = 0; i < n; i++) {
      let bestIdx = 0
      let bestDist = Infinity
      for (let c = 0; c < k; c++) {
        const d = vecDistSq(vectors[i]!, centroids[c]!)
        if (d < bestDist) {
          bestDist = d
          bestIdx = c
        }
      }
      if (assignments[i] !== bestIdx) {
        assignments[i] = bestIdx
        changed = true
      }
    }
    if (!changed && iteration > 0) break

    // update centroids
    const newCent: Vec[] = Array.from({ length: k }, () => new Array(dim).fill(0))
    const counts = new Array(k).fill(0)
    for (let i = 0; i < n; i++) {
      const c = assignments[i]!
      counts[c] += 1
      for (let d = 0; d < dim; d++) {
        newCent[c]![d]! += vectors[i]![d]!
      }
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue
      for (let d = 0; d < dim; d++) {
        newCent[c]![d] = newCent[c]![d]! / counts[c]
      }
      centroids[c] = newCent[c]!
    }
  }

  return { assignments, centroids, iterations: iteration + 1 }
}
