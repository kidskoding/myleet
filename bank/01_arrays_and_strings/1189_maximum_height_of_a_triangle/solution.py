def max_height_of_triangle(red: int, blue: int) -> int:
    def height(first: int, second: int) -> int:
        h = 0
        need = 1
        use_first = True
        while True:
            if use_first:
                if first < need:
                    break
                first -= need
            else:
                if second < need:
                    break
                second -= need
            h += 1
            need += 1
            use_first = not use_first
        return h

    return max(height(red, blue), height(blue, red))
