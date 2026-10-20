from solution import maximum_population


def test_maximum_population_earliest_year_wins():
    assert maximum_population([[1993, 1999], [2000, 2010]]) == 1993


def test_maximum_population_overlapping_lives():
    logs = [[1950, 1961], [1960, 1971], [1970, 1981]]
    assert maximum_population(logs) == 1960
