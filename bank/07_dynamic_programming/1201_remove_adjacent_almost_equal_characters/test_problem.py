from solution import remove_almost_equal_characters


def test_remove_almost_equal_characters_all_same():
    assert remove_almost_equal_characters("aaaaa") == 2


def test_remove_almost_equal_characters_mixed():
    assert remove_almost_equal_characters("abddez") == 2


def test_remove_almost_equal_characters_zigzag():
    assert remove_almost_equal_characters("zyxyxyz") == 3


def test_remove_almost_equal_characters_single():
    assert remove_almost_equal_characters("q") == 0


def test_remove_almost_equal_characters_already_clean():
    assert remove_almost_equal_characters("acegz") == 0


def test_remove_almost_equal_characters_pair():
    assert remove_almost_equal_characters("ba") == 1
