// Disposable test containers write caches only to tmpfs, never source or host data.
export default {cacheDir:'/tmp/v79-vitest-cache',test:{maxWorkers:1,fileParallelism:false}};
