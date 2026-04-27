/**
 * 작은 차원(<= 32) 데이터를 2D로 투영하는 PCA 헬퍼.
 *
 * 6축 능력치 갤럭시 view에서 사용 — power iteration 기반.
 * 외부 라이브러리 없이 동작 (의존성 추가 회피).
 */

type Vec = number[]
type Mat = number[][]

function vecDot(a: Vec, b: Vec): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!
  return s
}

function vecScale(v: Vec, k: number): Vec {
  return v.map((x) => x * k)
}

function vecNorm(v: Vec): number {
  return Math.sqrt(vecDot(v, v))
}

function vecNormalize(v: Vec): Vec {
  const n = vecNorm(v)
  return n === 0 ? v.map(() => 0) : vecScale(v, 1 / n)
}

function matVec(m: Mat, v: Vec): Vec {
  const out = new Array(m.length).fill(0)
  for (let i = 0; i < m.length; i++) {
    let s = 0
    for (let j = 0; j < v.length; j++) s += m[i]![j]! * v[j]!
    out[i] = s
  }
  return out
}

/** Rayleigh quotient: v^T M v / v^T v — 정규화된 v에 대해 eigenvalue 추정 */
function rayleigh(m: Mat, v: Vec): number {
  return vecDot(matVec(m, v), v) / vecDot(v, v)
}

/** Power iteration — 최대 eigenvector. iters는 6차원 정도면 60 충분 */
function powerIteration(m: Mat, iters: number, seed: Vec): Vec {
  let v = vecNormalize(seed)
  for (let i = 0; i < iters; i++) {
    const w = matVec(m, v)
    const wn = vecNormalize(w)
    // 수렴 검사 — 부호 무관
    if (Math.abs(Math.abs(vecDot(v, wn)) - 1) < 1e-9) {
      v = wn
      break
    }
    v = wn
  }
  return v
}

export interface Pca2DResult {
  /** 투영된 2D 포인트 (입력 순서) */
  points: Array<[number, number]>
  /** PC1·PC2 explained variance ratio (대략) */
  explained: [number, number]
  /** 6축 → PC1·PC2 loading (어느 축이 PC를 주도하는지) */
  loadings: { pc1: Vec; pc2: Vec }
}

/**
 * @param vectors 입력 벡터들 (모두 같은 차원). 빈 배열이면 빈 결과.
 * @returns 2D 투영 결과 + 분산 설명 비율 + 축별 loading
 */
export function pca2D(vectors: Vec[]): Pca2DResult {
  const n = vectors.length
  if (n === 0) {
    return { points: [], explained: [0, 0], loadings: { pc1: [], pc2: [] } }
  }
  const dim = vectors[0]!.length

  // 1. 평균 중심화
  const mean = new Array(dim).fill(0)
  for (const v of vectors) for (let i = 0; i < dim; i++) mean[i] += v[i]! / n
  const centered = vectors.map((v) => v.map((x, i) => x - mean[i]!))

  // 2. 공분산 행렬 (dim x dim)
  const cov: Mat = Array.from({ length: dim }, () => new Array(dim).fill(0))
  for (const v of centered) {
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        cov[i]![j]! += (v[i]! * v[j]!) / Math.max(1, n - 1)
      }
    }
  }

  // 3. 톱 2개 eigenvector
  const seed1 = new Array(dim).fill(0).map((_, i) => (i === 0 ? 1 : 0))
  const pc1 = powerIteration(cov, 80, seed1)
  const lambda1 = rayleigh(cov, pc1)

  // Deflation
  const cov2: Mat = cov.map((row, i) => row.map((v, j) => v - lambda1 * pc1[i]! * pc1[j]!))
  // PC2 시드는 PC1과 직교하도록 첫 시도
  const seed2 = new Array(dim).fill(0).map((_, i) => (i === 1 ? 1 : 0))
  let pc2 = powerIteration(cov2, 80, seed2)
  // PC1에 대한 직교성 보정 (Gram-Schmidt 한 번)
  const proj = vecDot(pc2, pc1)
  pc2 = vecNormalize(pc2.map((x, i) => x - proj * pc1[i]!))
  const lambda2 = rayleigh(cov, pc2)

  // 4. 투영
  const points: Array<[number, number]> = centered.map((v) => [
    vecDot(v, pc1),
    vecDot(v, pc2),
  ])

  // 분산 설명 — trace of cov = total variance
  let trace = 0
  for (let i = 0; i < dim; i++) trace += cov[i]![i]!
  const totalVar = trace || 1
  return {
    points,
    explained: [lambda1 / totalVar, lambda2 / totalVar],
    loadings: { pc1, pc2 },
  }
}
