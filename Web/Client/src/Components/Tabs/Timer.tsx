import Quotes from "../SubChildren/Quotes";
import { useTimes } from "../Contexts/PomodoroSettings";
import {
  ChangeEvent,
  Reducer,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useMusicPlayer } from "../Contexts/MusicHandler";
import { usePhotos } from "../Contexts/PicturesHandler";
import { useStorage } from "../Contexts/StorageHandler";

export type times = "longBreak" | "shortBreak" | "focus";
type task = {
  id: number;
  task: string;
  status: "Complete" | "Incomplete";
};
type State = {
  action: "null" | "add" | "subtract";
};
type Action = {
  type: "null" | "add" | "subtract";
};

export const dayValue = (): string => {
  switch (new Date().getDay()) {
    case 0:
      return "Sunday";
    case 1:
      return "Monday";
    case 2:
      return "Tuesday";
    case 3:
      return "Wednesday";
    case 4:
      return "Thursday";
    case 5:
      return "Friday";
    case 6:
      return "Saturday";
    default:
      return "Invalid";
  }
};
const reducer: Reducer<State, Action> = (_, action) => {
  switch (action.type) {
    case "add":
      return {
        action: "add",
      };
    case "subtract":
      return {
        action: "subtract",
      };
    default:
      return {
        action: "null",
      };
  }
};

const Timer = (): React.ReactNode => {
  //local storage
  const {
    activeTasksHandler,
    presentTasks,
    timer,
    activeTimeHandler,
    summaryTasks,
    summaryTHandler,
    summaryTimes,
    summaryTimeHandler,
  } = useStorage();
  //Time

  const [currentTimeOption, setCurrent] = useState<times>("focus"),
    { defaults } = useTimes(),
    changeTimeOption = () => {
      if (currentTimeOption == "focus") setCurrent("longBreak");
      else if (currentTimeOption == "longBreak") setCurrent("shortBreak");
      else setCurrent("focus");

      activeTimeHandler({
        type: currentTimeOption,
        minutes: defaults[currentTimeOption],
        seconds: 0,
        paused: pause,
      });
    },
    resetTimeOption = () => {
      setPause(true);
      setMinutes(defaults[currentTimeOption]);
      setSeconds(0);

      activeTimeHandler({
        type: currentTimeOption,
        minutes: defaults[currentTimeOption],
        seconds: 0,
        paused: pause,
      });
    };
  const [minutes, setMinutes] = useState<number>(defaults[currentTimeOption]),
    [seconds, setSeconds] = useState<number>(0),
    [pause, setPause] = useState<boolean>(true),
    initialTime = useRef<boolean>(true);

  useEffect(() => {
    if (
      timer != null &&
      timer.type != null &&
      timer.minutes != null &&
      timer.seconds != null
    ) {
      setCurrent(timer.type);
      setMinutes(timer.minutes);
      setSeconds(timer.seconds);
      setPause(timer.paused);
    }
  }, []);
  useEffect(() => {
    if (initialTime.current == false) {
      setMinutes(defaults[currentTimeOption]);
      setSeconds(0);
      activeTimeHandler({
        type: currentTimeOption,
        minutes: defaults[currentTimeOption],
        seconds: seconds,
        paused: pause,
      });
    }
  }, [currentTimeOption, defaults]);
  // --> Timer function
  useEffect(() => {
    const timeInterval: NodeJS.Timeout = setInterval(() => {
      if (pause == false) {
        setSeconds((seconds) => seconds - 1);
        if (seconds == 0) {
          setSeconds(59);
          setMinutes((minutes) => minutes - 1);
        }
      }
      if ((minutes < 0 || minutes == 0) && (seconds < 0 || seconds == 0)) {
        clearInterval(timeInterval);
        setPause(true);
        setMinutes(0);
        setSeconds(0);
        return;
      }
      if (initialTime.current == false) {
        activeTimeHandler({
          type: currentTimeOption,
          minutes: minutes,
          seconds: seconds,
          paused: pause,
        });
      }
    }, 1000);

    return () => {
      clearInterval(timeInterval);
    };
  }, [minutes, seconds, pause]);
  // --> Update summary of times to add day summary
  useEffect(() => {
    if (summaryTimes) {
      let dayFinder = summaryTimes.find((Day) => Day.Day == dayValue());
      if (dayFinder) return;
      else
        summaryTimeHandler([
          {
            Day: dayValue(),
            timeInhours: 0,
          },
        ]);
    }
  }, []);
  // --> update summary of the day
  useEffect(() => {
    if (!pause) {
      if (currentTimeOption == "focus") {
        let dayFinder = summaryTimes.find((Day) => Day.Day == dayValue());
        if (dayFinder) {
          summaryTimeHandler(
            summaryTimes.map((Day) => {
              if (Day.Day == dayValue()) {
                return {
                  ...Day,
                  timeInhours: Day.timeInhours + Math.floor(minutes / 60),
                };
              } else return Day;
            })
          );
        }
      }
    }
    initialTime.current = false;
  }, [minutes, pause]);

  //Tasks
  const [tasks, setTasks] = useState<task[]>([]),
    [input, setInput] = useState<string>(""),
    taskRef = useRef<HTMLInputElement | null>(null),
    [taskCount, setCount] = useState<number>(tasks.length),
    [state, dispatch] = useReducer(reducer, {
      action: "null",
    });

  // --> Get any present
  useEffect(() => {
    if (presentTasks.length > 0) setTasks(presentTasks);
  }, []);

  const taskHandler = () => {
      if (input != "") {
        setCount((count) => count + 1);
        setTasks((current) => [
          ...current,
          {
            id: taskCount + 1,
            task: input,
            status: "Incomplete",
          },
        ]);

        setInput("");
      } else {
        if (taskRef.current)
          taskRef.current.placeholder = "Enter a value first";
      }
    },
    updateTask = (taskId: number) => {
      setTasks((current) =>
        current.map((task) => {
          if (task.id == taskId) {
            dispatch({
              type: task.status == "Complete" ? "subtract" : "add",
            });
            return {
              ...task,
              id: task.id,
              status: task.status == "Complete" ? "Incomplete" : "Complete",
            };
          }
          return task;
        })
      );
    },
    deleteTask = (taskId: number) => {
      dispatch({
        type: "null",
      });
      setTasks((current) => {
        return current
          .filter((task) => task.id != taskId)
          .map((task) => {
            if (taskId > task.id) return task;
            else
              return {
                id: task.id - 1,
                task: task.task,
                status: task.status,
              };
          });
      });
    };

  // --> Update local storage
  useEffect(() => {
    activeTasksHandler(tasks);
  }, [tasks]);
  // --> Update summary
  useEffect(() => {
    if (summaryTasks.length == 0) {
      summaryTHandler([
        {
          Day: dayValue(),
          taskCount: 0,
        },
      ]);
    } else {
      let dayFinder = summaryTasks.find((Day) => Day.Day == dayValue());

      if (dayFinder)
        summaryTHandler((current) =>
          current.map((Day) => {
            if (Day.Day == dayValue())
              return {
                ...Day,
                taskCount:
                  state.action == "add"
                    ? Day.taskCount + 1
                    : state.action == "subtract"
                    ? Day.taskCount - 1
                    : Day.taskCount,
              };
            else return Day;
          })
        );
      else
        summaryTHandler((current) => [
          ...current,
          {
            Day: dayValue(),
            taskCount: tasks.filter((task) => task.status == "Complete").length,
          },
        ]);
    }
  }, [tasks, state]);
  useEffect(() => {
    dispatch({ type: "null" });
  }, [tasks]);

  //Music Handler
  const {
    audioRef,
    total,
    index,
    indexHandler,
    playing,
    playHandler,
    timeHandler,
  } = useMusicPlayer();

  const nextPreviousHandler = (action: "Next" | "Back") => {
    if (action == "Next") {
      if (index + 1 == total) indexHandler(0);
      else indexHandler((current) => current + 1);
      timeHandler(0);
    } else {
      if (index - 1 < 0) indexHandler(total - 1);
      else indexHandler((current) => current - 1);
      timeHandler(0);
    }
  };

  //Photos
  const photos = usePhotos(),
    photo = photos?.photos[5];

  return (
    <div id="timetab">
      <div id="timer">
        <div id="time">
          <h2>
            {currentTimeOption == "focus"
              ? "Focus"
              : currentTimeOption == "longBreak"
              ? "Long Break"
              : "Short Break"}
          </h2>
          <p>
            {minutes}:
            {seconds < 10 ? seconds.toString().padStart(2, "0") : seconds}
          </p>
        </div>
        <div id="controls">
          <button>
            <i className="fa-solid fa-repeat" onClick={resetTimeOption}></i>
          </button>
          <button onClick={() => setPause((current) => !current)}>
            {pause == true && <i className="fa-solid fa-play"></i>}
            {pause == false && <i className="fa-solid fa-pause"></i>}
          </button>
          <button>
            <i className="fa-solid fa-forward" onClick={changeTimeOption}></i>
          </button>
        </div>
        <Quotes />
      </div>
      <div id="tasks">
        <h1>Tasks</h1>
        <div id="add">
          <input
            type="text"
            placeholder="Add task"
            ref={taskRef}
            value={input}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setInput(event.target.value)
            }
          />
          <button onClick={taskHandler}>Add</button>
        </div>
        <div id="tasklist">
          {tasks.length > 0 &&
            tasks.map((task) => (
              <div key={task.id} id="task">
                <p>{task.task}</p>
                <div id="options">
                  <button onClick={() => updateTask(task.id)}>
                    {task.status == "Incomplete" && (
                      <i className="fa-solid fa-check"></i>
                    )}
                    {task.status == "Complete" && (
                      <i
                        className="fa-solid fa-check"
                        style={{ color: "green" }}
                      ></i>
                    )}
                  </button>
                  <button onClick={() => deleteTask(task.id)}>
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          {tasks.length == 0 && (
            <div className="text-center font-[Cookie] text-2xl p-2 relative top-[92px]">
              <p>No tasks added</p>
            </div>
          )}
        </div>
      </div>
      <div id="musictab">
        <div id="banner">
          <div id="innerControls">
            <div id="controls">
              <button onClick={() => nextPreviousHandler("Back")}>
                <i className="fa-solid fa-backward-step"></i>
              </button>
              <button
                onClick={() => {
                  playHandler(!playing);
                  if (audioRef?.current.currentTime)
                    timeHandler(audioRef.current.currentTime);
                }}
              >
                {playing == false && <i className="fa-solid fa-play"></i>}
                {playing == true && <i className="fa-solid fa-pause"></i>}
              </button>
              <button onClick={() => nextPreviousHandler("Next")}>
                <i className="fa-solid fa-forward-step"></i>
              </button>
            </div>
          </div>
          <img
            src={
              photos != null
                ? photo?.src.original
                : "https://img.freepik.com/premium-photo/illustration-girl-sitting-balcony-with-her-cat-watching-sunset_1260208-167.jpg?semt=ais_hybrid"
            }
          />
        </div>
        <div id="controls">
          <button></button>
        </div>
      </div>
    </div>
  );
};

export default Timer;
