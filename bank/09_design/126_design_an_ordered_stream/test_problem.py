from solution import OrderedStream


def test_ordered_stream_releases_chunks_in_order():
    stream = OrderedStream(5)
    assert stream.insert(3, "ccccc") == []
    assert stream.insert(1, "aaaaa") == ["aaaaa"]
    assert stream.insert(2, "bbbbb") == ["bbbbb", "ccccc"]
    assert stream.insert(5, "eeeee") == []
    assert stream.insert(4, "ddddd") == ["ddddd", "eeeee"]


def test_ordered_stream_in_order_inserts():
    stream = OrderedStream(3)
    assert stream.insert(1, "a") == ["a"]
    assert stream.insert(2, "b") == ["b"]
    assert stream.insert(3, "c") == ["c"]


def test_ordered_stream_reverse_inserts():
    stream = OrderedStream(3)
    assert stream.insert(3, "c") == []
    assert stream.insert(2, "b") == []
    assert stream.insert(1, "a") == ["a", "b", "c"]


def test_ordered_stream_single_slot():
    stream = OrderedStream(1)
    assert stream.insert(1, "only") == ["only"]
