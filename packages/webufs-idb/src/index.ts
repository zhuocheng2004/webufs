
import { isEven } from "@webufs/webufs"

export default function FooComponent() {
    const randomNumber = Math.floor(Math.random() * 5)
    console.log(`FooComponent: ${randomNumber} -> isEven: ${isEven(randomNumber)}`)
}
