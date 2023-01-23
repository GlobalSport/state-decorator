export default class Graph {
  private keys: string[];
  private adj: Partial<Record<string, string[]>>;

  constructor(keys: string[]) {
    this.keys = keys;
    this.adj = {};
  }

  // This function is a variation of DFSUtil() in
  // https://www.geeksforgeeks.org/archives/18212
  private isCyclicUtil(k: string, visited: Set<string>, recStack: Set<string>): boolean {
    // Mark the current node as visited and
    // part of recursion stack

    if (recStack.has(k)) {
      return true;
    }
    if (visited.has(k)) {
      return false;
    }

    visited.add(k);
    recStack.add(k);

    const children = this.adj[k] ?? [];
    for (const c of children) {
      if (this.isCyclicUtil(c, visited, recStack)) {
        return true;
      }
    }

    recStack.delete(k);

    return false;
  }

  public setEdges(sou: string, dest: string[]) {
    this.adj[sou] = dest;
  }

  // Returns true if the graph contains a
  // cycle, else false.
  // This function is a variation of DFS() in
  // https://www.geeksforgeeks.org/archives/18212
  public isCyclic(): boolean {
    // Mark all the vertices as not visited and
    // not part of recursion stack
    const visited = new Set<string>();
    const recStack = new Set<string>();
    // Call the recursive helper function to
    // detect cycle in different DFS trees
    for (const k of this.keys) {
      if (this.isCyclicUtil(k, visited, recStack)) {
        return true;
      }
    }

    return false;
  }
}
