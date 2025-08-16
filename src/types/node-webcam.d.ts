declare module 'node-webcam' {
    interface WebcamOptions {
        width?: number;
        height?: number;
        quality?: number;
        delay?: number;
        saveShots?: boolean;
        output?: string;
        device?: string | boolean;
        callbackReturn?: string;
    }

    interface Webcam {
        capture(filename: string, callback: (error: any, data: any) => void): void;
    }

    function create(options: WebcamOptions): Webcam;
    
    export = {
        create
    };
}
