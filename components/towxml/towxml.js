Component({
  options: {
    styleIsolation: "shared",
  },
  properties: {
    nodes: {
      type: Object,
      value: {},
    },
    openTyper: {
      type: Boolean,
      value: false,
    },
    speed: {
      type: Number,
      value: 15,
    },
  },
  observers: {
    openTyper: function (newVal) {
      const { openTyper } = require("./typer");
      openTyper.value = newVal;
    },
    nodes: function (newVal) {
      if (this.properties.openTyper) {
        const {
          curLastLeafNodeId,
          curNodes,
          reset,
          renderStartTime,
          openTyper
        } = require("./typer");
        
        openTyper.value = this.properties.openTyper;
        
        if (newVal && newVal.id) {
          reset();
          const lastId = this.getLastLeafNodeId(newVal);
          curLastLeafNodeId.value = lastId;
          curNodes.value = newVal;
          this.data.changeDecode = !this.data.changeDecode;
          this.setData({ changeDecode: this.data.changeDecode });
          renderStartTime.value = Date.now();
        }
      }
    }
  },
  lifetimes: {
    created: function() {
      const { openTyper } = require("./typer");
      openTyper.value = this.properties.openTyper;
    },
    attached: function () {
      const { openTyper } = require("./typer");
      openTyper.value = this.properties.openTyper;
      const { renderStartTime } = require("./typer");
      renderStartTime.value = Date.now();
    },
    ready: function () {
      const { openTyper } = require("./typer");
      openTyper.value = this.properties.openTyper;
    },
    detached: function () {
      const { reset } = require("./typer");
      reset();
    },
  },
  data: {
    someData: {},
    oldNodes: undefined,
    contentChanged: false,
    changeDecode: false,
  },
  methods: {
    getLastLeafNodeId(nodes) {
      if (!nodes.children || nodes.children.length == 0) {
        return nodes.id;
      } else {
        const validChildren = nodes.children.filter(child => 
          child && child.id !== undefined && 
          child.id !== null && 
          child.id !== "1.7976931348623157e+308" &&
          !(child.type === "text" && (!child.text || child.text === ""))
        );
        
        if (validChildren.length === 0) {
          return nodes.id;
        }
        
        const lastChild = validChildren[validChildren.length - 1];
        return this.getLastLeafNodeId(lastChild);
      }
    },
  },
});
