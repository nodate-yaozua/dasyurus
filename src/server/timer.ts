export default class Timer {
  public currentSpeed = 1
  private lastCheckedTime = -1 
  private stretchedTime = -100

  public start() {
    this.lastCheckedTime = performance.now()
  }

  public next() {
    const time = performance.now()
    const deltaTime = time - this.lastCheckedTime
    this.lastCheckedTime = time
    this.stretchedTime += deltaTime * this.currentSpeed
    return this.stretchedTime
  }

  public setSpeed(speed: number) {
    if (this.lastCheckedTime >= 0) this.next()
    this.currentSpeed = speed
  }
}