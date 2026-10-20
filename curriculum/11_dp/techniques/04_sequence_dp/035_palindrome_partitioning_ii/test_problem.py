from solution import min_cut


def test_min_cut_one_cut():
    assert min_cut("aab") == 1


def test_min_cut_already_palindrome():
    assert min_cut("a") == 0


def test_min_cut_no_shared_letters():
    assert min_cut("ab") == 1
