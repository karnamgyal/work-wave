declare module 'roboflow' {
    export class Roboflow {
        constructor(apiKey: string);
        
        predict(
            image: string | Buffer,
            modelId: string,
            version?: number
        ): Promise<any>;
    }
}
