from solution import min_window_subsequence


def test_min_window_subsequence_normal():
    assert min_window_subsequence("abcdebdde", "bde") == "bcde"


def test_min_window_subsequence_no_window():
    assert min_window_subsequence("abc", "xyz") == ""
