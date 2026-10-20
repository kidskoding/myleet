from solution import earliest_acq


def test_earliest_acq_six_people():
    logs = [
        [20190101, 0, 1],
        [20190104, 3, 4],
        [20190107, 2, 3],
        [20190211, 1, 5],
        [20190224, 2, 4],
        [20190301, 0, 3],
        [20190312, 1, 2],
        [20190322, 4, 5],
    ]
    assert earliest_acq(logs, 6) == 20190301


def test_earliest_acq_four_people():
    assert earliest_acq([[0, 2, 0], [1, 0, 1], [3, 0, 3], [4, 1, 2], [7, 3, 1]], 4) == 3


def test_earliest_acq_never_connected():
    assert earliest_acq([[0, 0, 1]], 3) == -1


def test_earliest_acq_unsorted_logs():
    assert earliest_acq([[5, 0, 1], [1, 1, 2]], 3) == 5


def test_earliest_acq_two_people():
    assert earliest_acq([[7, 1, 0]], 2) == 7
