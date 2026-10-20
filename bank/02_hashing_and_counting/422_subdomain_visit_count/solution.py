from collections import Counter


def subdomain_visits(cpdomains: list[str]) -> list[str]:
    # Time: O(total characters).
    # Space: O(number of distinct subdomains).
    counts: Counter[str] = Counter()
    for entry in cpdomains:
        count_str, domain = entry.split()
        count = int(count_str)
        parts = domain.split(".")
        for i in range(len(parts)):
            counts[".".join(parts[i:])] += count
    return [f"{c} {d}" for d, c in counts.items()]
