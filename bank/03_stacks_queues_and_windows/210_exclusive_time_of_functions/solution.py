def exclusive_time(n: int, logs: list[str]) -> list[int]:
    totals = [0] * n
    stack: list[int] = []
    previous = 0
    for log in logs:
        raw_id, kind, raw_time = log.split(":")
        function_id, timestamp = int(raw_id), int(raw_time)
        if kind == "start":
            if stack:
                totals[stack[-1]] += timestamp - previous
            stack.append(function_id)
            previous = timestamp
        else:
            totals[stack.pop()] += timestamp - previous + 1
            previous = timestamp + 1
    return totals
