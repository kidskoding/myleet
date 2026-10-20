from solution import DetectSquares


def test_count_basic_square_then_duplicate_corner():
    squares = DetectSquares()
    squares.add([3, 10])
    squares.add([11, 2])
    squares.add([3, 2])
    assert squares.count([11, 10]) == 1
    assert squares.count([14, 8]) == 0
    squares.add([11, 2])
    assert squares.count([11, 10]) == 2


def test_count_empty():
    assert DetectSquares().count([0, 0]) == 0


def test_count_duplicate_points_multiply():
    squares = DetectSquares()
    squares.add([0, 0])
    squares.add([0, 0])
    squares.add([0, 1])
    squares.add([1, 0])
    assert squares.count([1, 1]) == 2


def test_count_ignores_zero_area():
    squares = DetectSquares()
    squares.add([1, 1])
    squares.add([1, 1])
    assert squares.count([1, 1]) == 0


def test_count_squares_on_both_sides():
    squares = DetectSquares()
    for point in ([0, 0], [0, 2], [2, 0], [4, 0], [4, 2]):
        squares.add(point)
    assert squares.count([2, 2]) == 2
