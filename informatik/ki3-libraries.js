import KNN from 'ml-knn';
import { kmeans, kmeansGenerator } from 'ml-kmeans';
import { TDSolver } from 'reinforce-js';
import { createIcons, Play, Pause, RotateCcw, StepForward, FastForward, ClipboardList } from 'lucide';

window.KI3Libraries = {
  KNN, kmeans, kmeansGenerator, TDSolver,
  mountIcons: () => createIcons({ icons: { Play, Pause, RotateCcw, StepForward, FastForward, ClipboardList } })
};
