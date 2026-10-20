from solution import min_deletions


def test_min_deletions_already_unique():
    assert min_deletions("aab") == 0


def test_min_deletions_normal():
    assert min_deletions("aaabbbcc") == 2


def test_min_deletions_longer():
    assert min_deletions("ceabaacb") == 2
