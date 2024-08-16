import { Button } from './components/ui/button'
import { Play, CirclePause, Repeat, Pause } from 'lucide-react'
import { useEffect, useState } from 'react'

function App(): JSX.Element {
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [currentColor, setCurrentColor] = useState('#000000')

  useEffect(() => {
    const handleClick = (event: MouseEvent): void => {
      //To prevent the click event from being triggered when clicking on the action buttons in replay mode
      if (!(event.target as HTMLElement).closest('.button')) {
        window.electron.ipcRenderer.send('click', event)
      }
    }

    //to handle asynchronouse state changes when using global shortcuts
    const startRecording = (): void => {
      window.electron.ipcRenderer.send('start-recording')
      setIsRecording(true)
      setIsPaused(false)
    }

    const stopRecording = (): void => {
      window.electron.ipcRenderer.send('stop-recording')
      setIsRecording(false)
      setIsPaused(false)
    }

    const pauseRecording = (): void => {
      window.electron.ipcRenderer.send('pause-recording')
      setIsPaused(true)
    }

    const resumeRecording = (): void => {
      window.electron.ipcRenderer.send('resume-recording')
      setIsPaused(false)
    }
    //end of state changes

    window.electron.ipcRenderer.on('start-recording', startRecording)
    window.electron.ipcRenderer.on('stop-recording', stopRecording)
    window.electron.ipcRenderer.on('resume-recording', resumeRecording)
    window.electron.ipcRenderer.on('pause-recording', pauseRecording)

    window.addEventListener('click', handleClick)

    return (): void => {
      window.removeEventListener('click', handleClick)
      window.electron.ipcRenderer.removeAllListeners('start-recording')
      window.electron.ipcRenderer.removeAllListeners('stop-recording')
      window.electron.ipcRenderer.removeAllListeners('resume-recording')
      window.electron.ipcRenderer.removeAllListeners('pause-recording')
      window.electron.ipcRenderer.removeAllListeners('recorded-actions')
    }
  }, [])

  const handleRecordToggle = (): void => {
    const action = isRecording ? 'stop-recording' : 'start-recording'
    window.electron.ipcRenderer.send(action)
    setIsRecording(!isRecording)
    setIsPaused(false)
  }

  const handlePauseResume = (): void => {
    const action = isPaused ? 'resume-recording' : 'pause-recording'
    window.electron.ipcRenderer.send(action)
    setIsPaused(!isPaused)
  }

  const replayActions = (): void => window.electron.ipcRenderer.send('replay-actions')

  const randomColor = (): void => {
    const letters = '0123456789ABCDEF'
    let color = '#'
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)]
    }
    setCurrentColor(color)
  }
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-20">
      <div className="flex flex-row gap-4">
        <div className="flex flex-col gap-1">
          <Button
            onClick={handleRecordToggle}
            className="button"
            variant={isRecording ? 'destructive' : 'default'}
          >
            {!isRecording ? (
              <>
                <Play className="w-6 h-6 button" />
                <span className="ml-2">Start</span>
              </>
            ) : (
              <>
                <CirclePause className="w-6 h-6 button" />
                <span className="ml-2">Stop</span>
              </>
            )}
          </Button>
          <span className="text-white mx-auto font-medium">
            {' '}
            {!isRecording ? 'ctrl + p ' : 'ctrl + s'}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <Button disabled={!isRecording} onClick={handlePauseResume} className="button">
            {isPaused ? (
              <>
                <Play className="w-6 h-6 button" />
                <span className="ml-2">Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-6 h-6 button" />
                <span className="ml-2">Pause</span>
              </>
            )}
          </Button>
          <span className="text-white mx-auto font-medium"> space </span>
        </div>
        <div className="flex flex-col gap-1">
          <Button
            variant="outline"
            disabled={isRecording}
            onClick={replayActions}
            className="button"
          >
            <Repeat className="w-6 h-6 button" />
            <span className="ml-2">Replay</span>
          </Button>
          <span className="text-white mx-auto font-medium"> ctrl + r </span>
        </div>
      </div>

      <div className="flex flex-col">
        <Button style={{ backgroundColor: currentColor }} onClick={randomColor}>
          Click Me While Recording !!
        </Button>
      </div>
    </div>
  )
}

export default App
