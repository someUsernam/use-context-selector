import type React from "react";
import {
  type ReactNode,
  createContext,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

/**
 * A generic store interface for managing state.
 * @template State - The type of the state.
 */
export interface IStore<State> {
  /**
   * Returns the current state snapshot.
   */
  getSnapshot: () => State;
  /**
   * Updates the state given an updater function.
   */
  setState: (updater: (prevState: State) => State) => void;
  /**
   * Subscribes to state changes.
   * @returns A function to unsubscribe.
   */
  subscribe: (listener: () => void) => () => void;
}

/**
 * Options for the selector hook.
 * @template Selected - The type of the selected state.
 */
export type SelectorOptions<Selected> = {
  /**
   * Function to compare the previous and next selected values.
   */
  compare?: (prev: Selected, next: Selected) => boolean;
};

/**
 * A generic store for managing state.
 * @param initialValue - The initial state value.
 * @template State - The type of the state.
 */
class Store<State> implements IStore<State> {
  #state: State;
  readonly #listeners = new Set<() => void>();

  constructor(initialValue: State) {
    this.#state = initialValue;
  }

  getSnapshot(): State {
    return this.#state;
  }

  setState(updater: (prevState: State) => State): void {
    const nextState = updater(this.#state);
    // notify if state has changed
    if (nextState !== this.#state) {
      this.#state = nextState;
      this.#notify();
    }
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #notify() {
    for (const listener of this.#listeners) {
      listener();
    }
  }
}

export function createSelectContext<State>(initialState: State) {
  const StoreContext = createContext<IStore<State> | null>(null);
  const storeInstance = new Store(initialState);

  function Provider({ children }: { children: ReactNode }) {
    // Create the store instance once.
    const storeRef = useRef<IStore<State> | null>(null);

    // memo store instance to avoid re-renders.
    const memoStore = useMemo(() => {
      if (!storeRef.current) {
        storeRef.current = storeInstance;
      }
      return storeRef.current;
    }, []);

    return (
      <StoreContext.Provider value={memoStore}>
        {children}
      </StoreContext.Provider>
    );
  }

  return [StoreContext, Provider] as const;
}

export function useStore<State>(Context: React.Context<IStore<State> | null>) {
  const store = useContext(Context);
  if (!store) {
    throw new Error("Store Provider is missing");
  }
  return store;
}

/**
 * Selector hook to derive computed state.
 *
 * @param Context - The context for the store.
 * @param selector - Function to select a part of the state.
 * @param options - Options for the selector, such as comparison function.
 * @returns The selected state.
 */
export function useContextSelector<State, Selected>(
  Context: React.Context<IStore<State> | null>,
  selector: (state: State) => Selected,
  options: SelectorOptions<Selected> = {}
): Selected {
  const store = useStore(Context);

  const { compare = Object.is } = options;

  const previousSelectedStateRef = useRef<Selected | undefined>(undefined);

  const getSelectedSnapshot = (): Selected => {
    const newSelected = selector(store.getSnapshot());

    if (
      previousSelectedStateRef.current !== undefined &&
      compare(previousSelectedStateRef.current, newSelected)
    ) {
      return previousSelectedStateRef.current;
    }

    previousSelectedStateRef.current = newSelected;
    return newSelected;
  };

  function getServerSelectedSnapshot(): Selected {
    return selector(store.getSnapshot());
  }

  return useSyncExternalStore(
    store.subscribe,
    getSelectedSnapshot,
    getServerSelectedSnapshot
  );
}

export function useContextSetState<State>(
  Context: React.Context<IStore<State> | null>
): IStore<State>["setState"] {
  const store = useStore(Context);
  return store.setState;
}
