import React, { useCallback, useEffect, useState } from 'react';

/* GETTER PARAMS MUST BE MEMOIZED */

function useStateAsync<State>(
  initialState: State,
  getter: () => Promise<State>,
): { data: State; reload: () => void; set: React.Dispatch<React.SetStateAction<State>> };

function useStateAsync<State, Params>(
  initialState: State,
  getter: (params: Params) => Promise<State>,
  getterParams: Params,
): { data: State; reload: () => void; set: React.Dispatch<React.SetStateAction<State>> };

function useStateAsync<State, Params = undefined>(
  initialState: State,
  getter: (params?: Params) => Promise<State>,
  getterParams?: Params,
): { data: State; reload: () => void; set: React.Dispatch<React.SetStateAction<State>> } {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    let isSubscribed = true;
    getter(getterParams as Params).then((data) => {
      if (isSubscribed) {
        setState(data);
      }
    }).catch((error) => {
      console.error(error);
    });
    return () => { isSubscribed = false; };
  }, [getter, getterParams]);

  const reload = useCallback(() => {
    let isSubscribed = true;
    getter(getterParams as Params).then((data) => {
      if (isSubscribed) {
        setState(data);
      }
    }).catch((error) => {
      console.error(error);
    });
    return () => { isSubscribed = false; };
  }, [getter, getterParams]);

  return {
    data: state,
    reload,
    set: setState,
  };
}

export default useStateAsync;
