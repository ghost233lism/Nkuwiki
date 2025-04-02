Component({
  properties: {
    maxCount: { type: Number, value: 9 },
    currentFiles: { type: Array, value: [] }
  },
  methods: {
    handleUpload() {
      this.triggerEvent('upload', { max: this.data.maxCount })
    },
    handleDelete(e) {
      this.triggerEvent('delete', { index: e.detail.index })
    }
  }
}) 