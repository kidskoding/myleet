from solution import candy


def test_candy_normal():
    assert candy([1, 0, 2]) == 5


def test_candy_flat_ratings():
    assert candy([1, 1, 1]) == 3


def test_candy_increasing():
    assert candy([1, 2, 3]) == 6


def test_candy_single_child():
    assert candy([5]) == 1


def test_candy_empty():
    assert candy([]) == 0
