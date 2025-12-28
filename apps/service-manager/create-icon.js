/**
 * 간단한 트레이 아이콘 생성 스크립트
 * 16x16, 32x32 PNG 아이콘 생성
 */

const fs = require('fs')
const path = require('path')

// 16x16 게임 컨트롤러 아이콘 (🎮)
const icon16x16 = `iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAIbSURBVDiNlZNNaBNRFIXPe29mkkySNmkTY1KtP6AoiKCIC0HQhYu6cOXChQsRcSMKbgQXLkRw5UoQF4ILF+JCEAVBBBGkWkFBrVpja5s0zU+TmWQy8+a9u2iTxqYu9C7eh3PO4d4HjAMz/4oZYwzugeMA9gBwAIQAfgD4DOBbfC6KIrqu/8I/YpxzF8BVAG7MNWjDNF2tVjWeaTQaDY9SStu2e4lE4trw8PAFAM9isdVqtXaLxeIZhUIhLYpij2EYrtfrjWuapqVSKSeVSt3RNG3n6Ojo01gs1u12e7vFYvGELMvnnU5nq9vtbjEMQ/F9P5TP51cKCwsLC7Is36vX66parVZN0zQcxzEBoNVqbdE0jZRKJbnVav0cGBjYGh0dXfV9PyWKoi6KYpBIJD4Vi8WDsizf7Xa7mwEQAFAUBZIkabquk+M4Ouc8jlqt1k5N04bS6fS7TCbzOJ/PPwZwFEAQBHXO+Q9RFNM+gGw2eyGfz18OBIJAMFBV9YSmaXfb7fYpWZZvx2KxtWw2eyGZTL5Ip9NPhoeHLwG4CeBdqVQ6rWnaJ0EQNEEQ+pqmmZqm7ZNl+fXq6ur5sbGxPY7jHGy321sWFxcfTE5OPvI8z+acK/n5+cnV1dUFQRCwb9++fcYYOjo6Ohn/D4PBYCqXy72VZfk+5xyMMUiSBAB0aGjopCRJL2VZvoX/BAA6Ozt7pFqtngIQ/gX/K34BuqTXb7H2L6MAAAAASUVORK5CYII=`

// 32x32 게임 컨트롤러 아이콘
const icon32x32 = `iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAM8SURBVFiFxZdNbFNVGIafc+/t7W2h0EILZSyFCTiBGTYmE0yQhQuNxhh/NsbERBONcaULEwkJiRsXLly4YKExRl2ZqDHRuJEYjfEPMURZOBiQIQOGMNZS2tve3nPuPdeFtpe2d/TnJt/q5H7v+57vnO+c8wGP/l/UPHWg1+tNZzKZ40KIXk3TmgkhQgixqpRaMQxjZn5+/ubU1JRi5/rMzMw7Pp/vEyJ6DcA2Zlvs7e21giAI19bWvgdwG8ADq/P5fP+Vy+VxpdTZRCJxqr29fQjAGWvO6dOnPcXl5eUvOecH1tbWJolotqGGFEXxJxKJ1x3H+cZxnFdDoVCfiOj1HTt29BYXF5fned++fQPZbHZ/oVDwAhhbWVkRTTWMMQGA2traOwAOAehra2uzYrHY+/l8fgyAd3BwsH98fPwKgG8zmcxnmqZ9vLi4uMdxnOUdO3akaupHUdTn3t7e58Ph8A8AXiEiAgA/gOtKqUOe5eVlZwbA7u7ubQCeYYztW8+2RqNRANjZ2dlj+/2+OgD09fVtBfBuLpc7pmnaW4qie8LhMBwOh9fpdLrb2tp2c87fKRaLpxVFOV0sFn+1LPs8AP1xAuRyOe+GLQkp5UQqlXq2v7//0vz8/IjP53uluLh4V0rZAgDd3d0eSZLO+v3+H2Ox2DcAjoZCoasAZp4EgKZpTkRnhBA7lVIPbdu+AgBSym5VVVuJ6M1QKPSTEGJnMpm8BuCuUuo9m3P+MxF5hBB2fQFSSi9jLCqE+FEpddmyrBghRLeU8itN095Pp9M3LcuKEtEWSqVSTwEYbaghhHh+YmLCH4vFXhkaGtoXiUS+FkK8EY1GryUSiWEhxDHGmFVZV0TU/KYQURUA3HXdF1Op1GQqlRomog/tdvuJfD7/vVLqYD6f/45z/kFFQ0kpmxqapnlVVe0golEiGgXglFKpE0KIbqXUVcuyBiKRyDcAJiuay+VyZtu2bVq19RRFOV4ul6cYY7uFEAsA7iilLjDGdkspF5RS0/F4/OuRkZE3yuXy16qqvvqvgGRCCDGdz+cvALgQiUSuy7J8pdK/I8vy5Ug4HL5QLpc/Xy8fqC3j+kOaptUUgud5qzXnN/q/nUcVtVoWdV9O+wkN/7vxB/vxMKQWN1UZAAAAAElFTkSuQmCC`

// dist/resources 디렉토리 생성
const distDir = path.join(__dirname, 'dist', 'resources')
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

// assets 디렉토리 생성
const assetsDir = path.join(__dirname, 'assets')
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true })
}

// 아이콘 저장
fs.writeFileSync(
  path.join(distDir, 'icon.png'),
  Buffer.from(icon16x16, 'base64'),
)
fs.writeFileSync(
  path.join(distDir, 'icon@2x.png'),
  Buffer.from(icon32x32, 'base64'),
)
fs.writeFileSync(
  path.join(assetsDir, 'icon.png'),
  Buffer.from(icon16x16, 'base64'),
)
fs.writeFileSync(
  path.join(assetsDir, 'icon@2x.png'),
  Buffer.from(icon32x32, 'base64'),
)

console.log('✅ 트레이 아이콘 생성 완료!')
console.log('   📁 dist/resources/icon.png')
console.log('   📁 dist/resources/icon@2x.png')
console.log('   📁 assets/icon.png')
console.log('   📁 assets/icon@2x.png')
