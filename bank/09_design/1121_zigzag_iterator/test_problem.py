from solution import ZigzagIterator


def drain(it):
    out = []
    while it.has_next():
        out.append(it.next())
    return out


def test_zigzag_iterator_second_longer():
    assert drain(ZigzagIterator([1, 2], [3, 4, 5, 6])) == [1, 3, 2, 4, 5, 6]


def test_zigzag_iterator_second_empty():
    assert drain(ZigzagIterator([1], [])) == [1]


def test_zigzag_iterator_first_empty():
    assert drain(ZigzagIterator([], [1])) == [1]


def test_zigzag_iterator_first_longer():
    assert drain(ZigzagIterator([1, 2, 3, 4], [9])) == [1, 9, 2, 3, 4]


def test_zigzag_iterator_has_next_is_repeatable():
    it = ZigzagIterator([7], [8])
    assert it.has_next() is True
    assert it.has_next() is True
    assert it.next() == 7
    assert it.next() == 8
    assert it.has_next() is False
