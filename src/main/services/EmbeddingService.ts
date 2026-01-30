import { pipeline, PipelineType } from '@xenova/transformers'

class EmbeddingService {
  private static instance: EmbeddingService
  private pipe: any = null
  private modelName = 'Xenova/all-MiniLM-L6-v2'

  private constructor() {}

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService()
    }
    return EmbeddingService.instance
  }

  private async getPipeline() {
    if (!this.pipe) {
      console.log(`[EmbeddingService] Loading model ${this.modelName}...`)
      // Use 'feature-extraction' task
      this.pipe = await pipeline('feature-extraction', this.modelName)
      console.log(`[EmbeddingService] Model ${this.modelName} loaded.`)
    }
    return this.pipe
  }

  /**
   * Generates a 384-dimensional vector embedding for the given text.
   * @param text The text to embed.
   * @returns A promise that resolves to an array of numbers.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    try {
      const extractor = await this.getPipeline()
      // Generate embedding. Output is a Tensor.
      // pooling: 'mean' and normalize: true are often defaults or recommended for sentence-transformers
      // but Xenova's default behavior for this model essentially gives us the raw token embeddings usually.
      // However, for sentence embeddings, we typically want mean pooling.
      // The pipeline with 'feature-extraction' usually returns [batch_size, seq_len, hidden_size].
      // We can pass { pooling: 'mean', normalize: true } if supported, or handle it.
      // Let's rely on standard usage:
      const output = await extractor(text, { pooling: 'mean', normalize: true })

      // output.data is a Float32Array (or similar). We convert it to a regular number array.
      // Ensure we get a flat array representing the sentence embedding.
      return Array.from(output.data)
    } catch (error) {
      console.error('[EmbeddingService] Error generating embedding:', error)
      return []
    }
  }
}

export default EmbeddingService.getInstance()
