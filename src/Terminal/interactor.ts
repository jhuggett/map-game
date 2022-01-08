import { Coor } from "../Utils/Coordinate"
import { KDTree } from "../Utils/KDTree"
import { range } from "../Utils/Coordinate/misc"
import { TerminalSlice, TerminalPixel } from "."

export class TerminalInteractor {
  start: () => Coor
  end: () => Coor

  contentStart: () => Coor
  contentEnd: () => Coor

  cursorLocation: Coor

  pixels: KDTree<TerminalPixel>

  constructor(slice: TerminalSlice) {
    this.start = slice.start
    this.end = slice.end

    this.contentStart = this.start
    this.contentEnd = this.contentEnd

    let points: TerminalPixel[] = []

    range(this.start().y, this.end().y - 1).forEach(y => {
      range(this.start().x, this.end().x - 1).forEach(x => {
        points.push({
          location: new Coor(x, y),
          content: ' '
        })
      })
    })

    //let actualSize = (this.end.x - this.start.x) * (this.end.y - this.start.y)

    

    this.pixels = new KDTree(points.map(i => ({ point: i.location.asArray(), value: i })))

    this.cursorLocation = new Coor(this.start().x, this.start().y)

    this.resetCursor()



  }

  return() {
    //this.cursor.move.down()
    this.cursorLocation.x = this.start().x
  }

  clearScreen() {
    process.stdout.write("\033[2J")
    this.write("\033[H")
  }

  withinBounds(point: Coor) {
    return this.withinWidth(point.x) && this.withinHeight(point.y)
  }

  withinWidth(x: number) {
    return this.start().x <= x && x < this.end().x
  }

  withinHeight(y: number) {
    return this.start().y <= y && y < this.end().y
  }
  
  width() {
    return this.end().x - this.start().x
  }

  height() {
    return this.end().y - this.start().y
  }

  center() {
    return new Coor(
      Math.floor(this.width() / 2),
      Math.floor(this.height() / 2)
    )
  }

  resetCursor() {
    this.cursorLocation = new Coor(this.start().x, this.start().y)
  }

  write(message: string) {
    
    const pixel = this.pixels.find(this.cursorLocation.asArray())
    if (pixel) {
      pixel.value.content = message
      if (this.cursorLocation.x + 1 < this.end().x) {
        this.cursor.move.right()
      } else if (this.cursorLocation.y + 1 < this.end().y) {
        this.cursor.move.down()
        this.cursorLocation.x = this.start().x
      }
    }

    //console.log({cursorLocation: this.cursorLocation, message, start: this.start, end: this.end});
    


    return this
    process.stdout.write(message)
    return this
  }

  cursor = {
    move: {
      to: (point: Coor) => {
        if (this.withinBounds(point)) {
          this.cursorLocation = new Coor(point.x, point.y)
        }
      },
      up: (amount: number = 1) => {
        this.cursorLocation.y -= amount
      },
      left: (amount: number = 1) => {
        this.cursorLocation.x -= amount
      },
      right: (amount: number = 1) => {
        this.cursorLocation.x += amount
      },
      down: (amount: number = 1) => {
        this.cursorLocation.y += amount
      },
      by: (x: number, y: number) => {
        if (x < 0) {
          this.cursor.move.left(x * -1)
        } else {
          this.cursor.move.right(x)
        }
        if (y < 0) {
          this.cursor.move.up(y * -1)
        } else {
          this.cursor.move.down(y)
        }
      }
    },
  }

  coloring = {
    colors: {
      black: "\u001b[30m",
      red: "\u001b[31m",
      green: "\u001b[32m",
      yellow: "\u001b[33m",
      blue: "\u001b[34m",
      bgBlue: "\u001b[44m",
      bgGreen: "\u001b[42m",
      reset: "\u001b[0m"
    },
    red: (content: string) => {
        return this.coloring.colors.red + content + this.coloring.colors.reset
    },
    green: (content: string) => {
        return this.coloring.colors.green + content + this.coloring.colors.reset
    },
    yellow: (content: string) => {
        return this.coloring.colors.yellow + content + this.coloring.colors.reset
    },
    blue: (content: string) => {
        return this.coloring.colors.blue + content + this.coloring.colors.reset
    },

    bgBlue: (content: string) => {
        return this.coloring.colors.bgBlue + content + this.coloring.colors.reset
    },

    bgGreen: (content: string) => {
        return this.coloring.colors.bgGreen + content + this.coloring.colors.reset
    },
    fg256: (content, id: number) => {
      return `\u001b[38;5;${id}m` + content + this.coloring.colors.reset
    },
    bg256: (content, id: number) => {
      return `\u001b[48;5;${id}m` + content + this.coloring.colors.reset
    }
  }

  

  reactToKeyPress = async (callback?: (code: Buffer) => boolean) : Promise<Buffer> => {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    

    return new Promise( (resolve) => {
        return process.stdin.once('data', (data) => {
            //process.stdin.setRawMode(false)
            process.stdin.pause()
            if (callback && callback(data)) {
                this.reactToKeyPress(callback)
            }
            resolve(data)
            })
        })
  }
}