from solution import first_bad_version


def _bad_version_factory(first_bad: int):
    def is_bad_version(version: int) -> bool:
        return version >= first_bad

    return is_bad_version


def test_first_bad_version_middle():
    assert first_bad_version(5, _bad_version_factory(4)) == 4


def test_first_bad_version_first():
    assert first_bad_version(5, _bad_version_factory(1)) == 1


def test_first_bad_version_last():
    assert first_bad_version(5, _bad_version_factory(5)) == 5


def test_first_bad_version_single():
    assert first_bad_version(1, _bad_version_factory(1)) == 1
