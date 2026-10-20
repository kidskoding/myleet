from solution import KthLargest


def test_kth_largest_stream_basic():
    kth = KthLargest(3, [4, 5, 8, 2])
    assert kth.add(3) == 4
    assert kth.add(5) == 5
    assert kth.add(10) == 5
    assert kth.add(9) == 8
    assert kth.add(4) == 8


def test_kth_largest_stream_empty_initial():
    kth = KthLargest(1, [])
    assert kth.add(-3) == -3
    assert kth.add(-2) == -2
