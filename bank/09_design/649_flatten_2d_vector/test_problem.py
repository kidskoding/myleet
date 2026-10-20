from solution import Vector2D


def test_vector2d_example():
    it = Vector2D([[1, 2], [3], [4]])
    assert it.next() == 1
    assert it.next() == 2
    assert it.next() == 3
    assert it.has_next() is True
    assert it.has_next() is True
    assert it.next() == 4
    assert it.has_next() is False


def test_vector2d_skips_empty_rows():
    it = Vector2D([[], [5], [], [], [6, 7], []])
    assert it.next() == 5
    assert it.has_next() is True
    assert it.next() == 6
    assert it.next() == 7
    assert it.has_next() is False


def test_vector2d_only_empty_rows():
    assert Vector2D([[], []]).has_next() is False


def test_vector2d_no_rows():
    assert Vector2D([]).has_next() is False


def test_vector2d_next_without_has_next():
    it = Vector2D([[], [-1], [2, -3]])
    assert [it.next(), it.next(), it.next()] == [-1, 2, -3]
    assert it.has_next() is False
