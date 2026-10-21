from solution import maximum_requests


def test_maximum_requests_normal():
    requests = [[0, 1], [1, 0], [0, 1], [1, 2], [2, 0], [3, 4]]
    assert maximum_requests(5, requests) == 5


def test_maximum_requests_partial():
    assert maximum_requests(3, [[0, 0], [1, 2], [2, 1]]) == 3


def test_maximum_requests_limited():
    assert maximum_requests(4, [[0, 3], [0, 1], [3, 0], [2, 3], [1, 2], [0, 3]]) == 4


def test_maximum_requests_none():
    assert maximum_requests(3, [[0, 1], [1, 2]]) == 0
