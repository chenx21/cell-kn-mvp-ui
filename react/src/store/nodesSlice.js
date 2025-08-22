import { createSlice } from "@reduxjs/toolkit";

// Initial state for nodesSlice.
const initialState = {
  originNodeIds: [],
};

// Redux slice for managing user's selection of origin nodes.
const nodesSlice = createSlice({
  name: "nodesSlice",
  initialState,
  // Synchronous actions and reducers.
  reducers: {
    /**
     * Adds single node ID to nodesSlice.
     * Prevents duplicate entries.
     */
    addTonodesSlice: (state, action) => {
      const nodeId = action.payload;
      if (!state.originNodeIds.includes(nodeId)) {
        state.originNodeIds.push(nodeId);
      }
    },
    /**
     * Removes single node ID from nodesSlice.
     */
    removeFromnodesSlice: (state, action) => {
      const nodeIdToRemove = action.payload;
      state.originNodeIds = state.originNodeIds.filter(
        (id) => id !== nodeIdToRemove,
      );
    },
    /**
     * Clears all node IDs from nodesSlice.
     */
    clearNodesSlice: (state) => {
      state.originNodeIds = [];
    },
    /**
     * Replaces entire nodesSlice with new array of node IDs.
     */
    setNodesSlice: (state, action) => {
      state.originNodeIds = action.payload;
    },
    /**
     * Adds node ID to nodesSlice if not present, or removes it if it is.
     */
    toggleNodesSliceItem: (state, action) => {
      const nodeId = action.payload;
      const index = state.originNodeIds.indexOf(nodeId);
      if (index >= 0) {
        // If item exists, remove it.
        state.originNodeIds.splice(index, 1);
      } else {
        // If item does not exist, add it.
        state.originNodeIds.push(nodeId);
      }
    },
  },
});

// Export action creators for use in components.
export const { addToNodesSlice, removeFromNodesSlice, clearNodesSlice, setNodesSlice, toggleNodesSliceItem } =
  nodesSlice.actions;

// Export reducer for inclusion in Redux store.
export default nodesSlice.reducer;
