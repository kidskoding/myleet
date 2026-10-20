from solution import DataStream


def test_data_stream_example():
    stream = DataStream(4, 3)
    assert [stream.consec(x) for x in (4, 4, 4, 3)] == [False, False, True, False]


def test_data_stream_k_one():
    stream = DataStream(7, 1)
    assert stream.consec(7) is True
    assert stream.consec(8) is False
    assert stream.consec(7) is True


def test_data_stream_mismatch_resets_run():
    stream = DataStream(2, 2)
    assert [stream.consec(x) for x in (2, 2, 3, 2, 2)] == [False, True, False, False, True]


def test_data_stream_stays_true_on_long_run():
    stream = DataStream(1, 2)
    assert [stream.consec(1) for _ in range(5)] == [False, True, True, True, True]


def test_data_stream_never_matches():
    stream = DataStream(5, 1)
    assert [stream.consec(x) for x in (1, 2, 3)] == [False, False, False]
