// src/types/lz4js.d.ts

declare module 'lz4js' {
    /**
     * 计算压缩数据所需的上限大小
     */
    export function compressBound(n: number): number;

    /**
     * 通过读取 Frame 头部计算解压后所需的大小（要求数据包含 Magic Number）
     */
    export function decompressBound(src: Uint8Array): number;

    /**
     * 创建一个 Uint8Array 缓冲区（兼容旧版浏览器的回退实现）
     */
    export function makeBuffer(size: number): Uint8Array;

    /**
     * 【核心】解压一个原始 LZ4 数据块 (Raw Block)
     * 这种模式不检查 Magic Number，适合处理自定义游戏存档格式
     * @param src 压缩源数据
     * @param dst 预先分配好的目标缓冲区 (大小必须足够存放解压后的数据)
     * @param sIndex 源数据起始偏移量 (通常为 0)
     * @param sLength 源数据长度 (压缩后的字节数)
     * @param dIndex 目标缓冲区起始写入偏移量 (通常为 0)
     * @returns 返回解压后在目标缓冲区中的结束位置索引
     */
    export function decompressBlock(
        src: Uint8Array,
        dst: Uint8Array,
        sIndex: number,
        sLength: number,
        dIndex: number
    ): number;

    /**
     * 压缩一个原始数据块
     */
    export function compressBlock(
        src: Uint8Array,
        dst: Uint8Array,
        sIndex: number,
        sLength: number,
        hashTable: Uint32Array
    ): number;

    /**
     * 解压标准的 LZ4 Frame 帧（要求包含 Magic Number 和描述符）
     */
    export function decompressFrame(src: Uint8Array, dst: Uint8Array): number;

    /**
     * 将数据压缩为标准的 LZ4 Frame 帧
     */
    export function compressFrame(src: Uint8Array, dst: Uint8Array): number;

    /**
     * 【高层 API】解压包含 LZ4 Frame 的缓冲区
     * 如果不传 maxSize，它会尝试解析头部来自动确定大小
     */
    export function decompress(src: Uint8Array, maxSize?: number): Uint8Array;

    /**
     * 【高层 API】将缓冲区压缩为 LZ4 Frame
     */
    export function compress(src: Uint8Array, maxSize?: number): Uint8Array;
}
