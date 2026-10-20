from solution import Iterator, PeekingIterator


def test_peeking_iterator_example():
    it = PeekingIterator(Iterator([1, 2, 3]))
    assert it.next() == 1
    assert it.peek() == 2
    assert it.next() == 2
    assert it.next() == 3
    assert it.has_next() is False


def test_peeking_iterator_repeated_peek_does_not_advance():
    it = PeekingIterator(Iterator([5, 6]))
    assert it.peek() == 5
    assert it.peek() == 5
    assert it.next() == 5
    assert it.peek() == 6


def test_peeking_iterator_single_element():
    it = PeekingIterator(Iterator([9]))
    assert it.has_next() is True
    assert it.peek() == 9
    assert it.next() == 9
    assert it.has_next() is False


def test_peeking_iterator_drain_with_peek():
    it = PeekingIterator(Iterator([4, 4, 7, 1]))
    out = []
    while it.has_next():
        assert it.peek() == it.peek()
        out.append(it.next())
    assert out == [4, 4, 7, 1]
