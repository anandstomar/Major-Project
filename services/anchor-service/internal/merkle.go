package internal

import (
    "crypto/sha256"
    "encoding/hex"
)

// combineRoots does a pairwise combine of hex-encoded roots and returns hex root
func CombineRootsHex(roots []string) (string, error) {
    if len(roots) == 0 {
        return "", nil
    }
    layer := make([][]byte, 0, len(roots))
    for _, r := range roots {
        // trim 0x
        if len(r) >= 2 && r[:2] == "0x" {
            r = r[2:]
        }
        b, err := hex.DecodeString(r)
        if err != nil {
            return "", err
        }
        layer = append(layer, b)
    }

    for len(layer) > 1 {
        next := make([][]byte, 0, (len(layer)+1)/2)
        for i := 0; i < len(layer); i += 2 {
            left := layer[i]
            var right []byte
            if i+1 < len(layer) {
                right = layer[i+1]
            } else {
                right = left
            }
            concat := append(left, right...)
            h := sha256.Sum256(concat)
            next = append(next, h[:])
        }
        layer = next
    }
    return hex.EncodeToString(layer[0]), nil
}
