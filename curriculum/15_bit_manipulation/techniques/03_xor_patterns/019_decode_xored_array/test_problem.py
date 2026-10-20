from solution import decode


def test_decode_normal():
    assert decode([1, 2, 3], 1) == [1, 0, 2, 1]


def test_decode_longer():
    assert decode([6, 2, 7, 3], 4) == [4, 2, 0, 7, 4]
