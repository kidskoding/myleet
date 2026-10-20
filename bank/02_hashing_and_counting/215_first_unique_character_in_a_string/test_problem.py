from solution import first_uniq_char


def test_first_uniq_char_first_position():
    assert first_uniq_char("leetcode") == 0


def test_first_uniq_char_middle():
    assert first_uniq_char("loveleetcode") == 2


def test_first_uniq_char_none():
    assert first_uniq_char("aabb") == -1


def test_first_uniq_char_single():
    assert first_uniq_char("z") == 0


def test_first_uniq_char_last_position():
    assert first_uniq_char("aabbc") == 4
