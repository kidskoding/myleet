from solution import smallest_subsequence


def test_smallest_subsequence_bcabc():
    assert smallest_subsequence("bcabc") == "abc"


def test_smallest_subsequence_cbacdcbc():
    assert smallest_subsequence("cbacdcbc") == "acdb"


def test_smallest_subsequence_already_unique():
    assert smallest_subsequence("abcd") == "abcd"


def test_smallest_subsequence_all_same():
    assert smallest_subsequence("aaaa") == "a"


def test_smallest_subsequence_reverse_sorted():
    assert smallest_subsequence("edcba") == "edcba"
