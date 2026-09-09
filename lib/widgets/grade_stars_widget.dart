import 'package:flutter/material.dart';

class GradeStarsWidget extends StatelessWidget {
  final String? grade;
  final double starSize;
  final double fontSize;
  final bool showLabel;

  const GradeStarsWidget({
    super.key,
    required this.grade,
    this.starSize = 12.0,
    this.fontSize = 11.0,
    this.showLabel = true,
  });

  static int getStarCount(String? rawGrade) {
    final g = (rawGrade ?? 'A+').toUpperCase().trim();
    if (g.contains('A++')) return 5;
    if (g.contains('A+')) return 4;
    if (g.contains('GOOD')) return 3;
    if (g.contains('NORMAL')) return 2;
    return g.contains('A') ? 4 : 2;
  }

  static String getCleanLabel(String? rawGrade) {
    final g = (rawGrade ?? 'A+').toUpperCase().trim();
    if (g.contains('A++')) return 'A++';
    if (g.contains('A+')) return 'A+';
    if (g.contains('GOOD')) return 'GOOD';
    if (g.contains('NORMAL')) return 'NORMAL';
    return g.isEmpty ? 'NORMAL' : g;
  }

  @override
  Widget build(BuildContext context) {
    final starsCount = getStarCount(grade);
    final cleanLabel = getCleanLabel(grade);

    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        if (showLabel) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            margin: const EdgeInsets.only(right: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF3B82F6).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(
                color: const Color(0xFF3B82F6).withValues(alpha: 0.35),
                width: 0.8,
              ),
            ),
            child: Text(
              cleanLabel,
              style: TextStyle(
                fontSize: fontSize,
                fontWeight: FontWeight.w900,
                color: const Color(0xFF60A5FA),
                letterSpacing: 0.5,
              ),
            ),
          ),
        ],
        Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(
            starsCount,
            (index) => Padding(
              padding: const EdgeInsets.only(right: 2.0),
              child: Icon(
                Icons.star_rounded,
                size: starSize,
                color: const Color(0xFFF59E0B),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
