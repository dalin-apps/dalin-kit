/**
 * cmdk's command-score, copied from cmdk 1.1.1
 * (https://github.com/dip/cmdk, `cmdk/src/command-score.ts`), which took it
 * from Superhuman's command-score. The kit ranks the palette's actions with
 * it (palette-match.ts) and exports it for a source that wants the same
 * order. The code below is cmdk's, with types and one non-null assertion
 * added for the kit's strict compiler, and nothing else changed.
 *
 * MIT License
 *
 * Copyright (c) 2022 Paco Coursey
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export declare function commandScore(string: string, abbreviation: string, aliases: string[]): number;
//# sourceMappingURL=command-score.d.ts.map